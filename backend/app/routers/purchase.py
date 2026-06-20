from decimal import Decimal
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.product import Product, MovementType
from app.models.purchase import PurchaseOrder, PurchaseOrderLine, PurchaseOrderStatus
from app.models.user import User, UserRole
from app.schemas.purchase import PurchaseOrderCreate, PurchaseOrderUpdate, PurchaseOrderOut, ReceiveRequest
from app.core.deps import get_current_user, require_roles
from app.services.stock import record_movement
from app.services.audit import log_action
from app.services.sequence import next_po_name

router = APIRouter(prefix="/api/purchase", tags=["Purchase"])
_write = require_roles(UserRole.purchase, UserRole.owner, UserRole.admin)


@router.post("", response_model=PurchaseOrderOut, status_code=201)
def create_purchase_order(
    payload: PurchaseOrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(_write),
):
    order = PurchaseOrder(
        name=next_po_name(db),
        vendor_id=payload.vendor_id,
        order_date=payload.order_date,
        expected_date=payload.expected_date,
        notes=payload.notes,
        origin_ref=payload.origin_ref,
        created_by=current_user.id,
    )
    db.add(order)
    db.flush()

    for line_data in payload.lines:
        product = db.query(Product).filter(Product.id == line_data.product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail=f"Product {line_data.product_id} not found")
        line = PurchaseOrderLine(
            order_id=order.id,
            product_id=line_data.product_id,
            qty_ordered=line_data.qty_ordered,
            unit_price=line_data.unit_price,
        )
        db.add(line)

    db.commit()
    db.refresh(order)
    log_action(db, "CREATE", "purchase_order", order.id, order.name, user_id=current_user.id)
    db.commit()
    return order


@router.get("", response_model=List[PurchaseOrderOut])
def list_purchase_orders(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.query(PurchaseOrder).order_by(PurchaseOrder.created_at.desc()).all()


@router.get("/{order_id}", response_model=PurchaseOrderOut)
def get_purchase_order(order_id: UUID, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    order = db.query(PurchaseOrder).filter(PurchaseOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    return order


@router.put("/{order_id}", response_model=PurchaseOrderOut)
def update_purchase_order(
    order_id: UUID,
    payload: PurchaseOrderUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(_write),
):
    order = db.query(PurchaseOrder).filter(PurchaseOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    if order.status != PurchaseOrderStatus.draft:
        raise HTTPException(status_code=400, detail="Only draft orders can be edited")
    if payload.expected_date is not None:
        order.expected_date = payload.expected_date
    if payload.notes is not None:
        order.notes = payload.notes
    db.commit()
    db.refresh(order)
    log_action(db, "UPDATE", "purchase_order", order.id, order.name, user_id=current_user.id)
    db.commit()
    return order


@router.post("/{order_id}/confirm", response_model=PurchaseOrderOut)
def confirm_purchase_order(
    order_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(_write),
):
    order = db.query(PurchaseOrder).filter(PurchaseOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    if order.status != PurchaseOrderStatus.draft:
        raise HTTPException(status_code=400, detail="Order is not in draft state")
    order.status = PurchaseOrderStatus.confirmed
    db.commit()
    db.refresh(order)
    log_action(db, "CONFIRM", "purchase_order", order.id, order.name, user_id=current_user.id)
    db.commit()
    return order


@router.post("/{order_id}/receive", response_model=PurchaseOrderOut)
def receive_purchase_order(
    order_id: UUID,
    payload: ReceiveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(_write),
):
    order = db.query(PurchaseOrder).filter(PurchaseOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    if order.status not in (PurchaseOrderStatus.confirmed, PurchaseOrderStatus.partially_received):
        raise HTTPException(status_code=400, detail="Order must be confirmed before receiving")

    line_map = {line.id: line for line in order.lines}
    for receive in payload.lines:
        line = line_map.get(receive.line_id)
        if not line:
            raise HTTPException(status_code=404, detail=f"Line {receive.line_id} not found")
        qty = receive.qty
        if qty <= 0:
            raise HTTPException(status_code=400, detail="Receive qty must be positive")
        if float(qty) > float(line.qty_remaining):
            raise HTTPException(status_code=400, detail=f"Cannot receive more than ordered for line {receive.line_id}")

        product = db.query(Product).filter(Product.id == line.product_id).first()
        record_movement(
            db, product, MovementType.purchase_receipt, qty,
            reference_type="purchase_order", reference_id=order.id,
            notes=f"Receipt for {order.name}", created_by=current_user.id,
        )
        line.qty_received = Decimal(str(line.qty_received)) + qty

    all_received = all(float(l.qty_remaining) <= 0 for l in order.lines)
    any_received = any(float(l.qty_received) > 0 for l in order.lines)
    if all_received:
        order.status = PurchaseOrderStatus.fully_received
    elif any_received:
        order.status = PurchaseOrderStatus.partially_received

    db.commit()
    db.refresh(order)
    log_action(db, "RECEIVE", "purchase_order", order.id, order.name, user_id=current_user.id)
    db.commit()
    return order


@router.post("/{order_id}/cancel", response_model=PurchaseOrderOut)
def cancel_purchase_order(
    order_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(_write),
):
    order = db.query(PurchaseOrder).filter(PurchaseOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    if order.status in (PurchaseOrderStatus.fully_received, PurchaseOrderStatus.cancelled):
        raise HTTPException(status_code=400, detail="Cannot cancel this order")
    order.status = PurchaseOrderStatus.cancelled
    db.commit()
    db.refresh(order)
    log_action(db, "CANCEL", "purchase_order", order.id, order.name, user_id=current_user.id)
    db.commit()
    return order
