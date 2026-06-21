from datetime import date
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.product import Product, MovementType, ProcurementStrategy
from app.models.sales import SalesOrder, SalesOrderLine, SalesOrderStatus
from app.models.user import User, UserRole
from app.schemas.sales import SalesOrderCreate, SalesOrderUpdate, SalesOrderOut, DeliverRequest
from app.core.deps import get_current_user, require_roles
from app.services.stock import record_movement, reserve_stock, release_reservation
from app.services.audit import log_action
from app.services.sequence import next_so_name
from app.services.procurement import trigger_procurement

router = APIRouter(prefix="/api/sales", tags=["Sales"])
_write = require_roles(UserRole.sales, UserRole.owner, UserRole.admin)


@router.post("", response_model=SalesOrderOut, status_code=201)
def create_sales_order(
    payload: SalesOrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(_write),
):
    order = SalesOrder(
        name=next_so_name(db),
        customer_id=payload.customer_id,
        order_date=payload.order_date,
        expected_delivery_date=payload.expected_delivery_date,
        notes=payload.notes,
        created_by=current_user.id,
    )
    db.add(order)
    db.flush()

    for line_data in payload.lines:
        product = db.query(Product).filter(Product.id == line_data.product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail=f"Product {line_data.product_id} not found")
        line = SalesOrderLine(
            order_id=order.id,
            product_id=line_data.product_id,
            qty_ordered=line_data.qty_ordered,
            unit_price=line_data.unit_price,
        )
        db.add(line)

    db.commit()
    db.refresh(order)
    log_action(db, "CREATE", "sales_order", order.id, order.name, user_id=current_user.id)
    db.commit()
    return order


@router.get("", response_model=List[SalesOrderOut])
def list_sales_orders(
    status: Optional[SalesOrderStatus] = Query(None),
    customer_id: Optional[UUID] = Query(None),
    date_from: Optional[date] = Query(None, description="Filter by order_date >="),
    date_to: Optional[date] = Query(None, description="Filter by order_date <="),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.query(SalesOrder)
    if status:
        q = q.filter(SalesOrder.status == status)
    if customer_id:
        q = q.filter(SalesOrder.customer_id == customer_id)
    if date_from:
        q = q.filter(SalesOrder.order_date >= date_from)
    if date_to:
        q = q.filter(SalesOrder.order_date <= date_to)
    return q.order_by(SalesOrder.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/{order_id}", response_model=SalesOrderOut)
def get_sales_order(order_id: UUID, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    order = db.query(SalesOrder).filter(SalesOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Sales order not found")
    return order


@router.put("/{order_id}", response_model=SalesOrderOut)
def update_sales_order(
    order_id: UUID,
    payload: SalesOrderUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(_write),
):
    order = db.query(SalesOrder).filter(SalesOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Sales order not found")
    if order.status not in (SalesOrderStatus.draft,):
        raise HTTPException(status_code=400, detail="Only draft orders can be edited")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(order, field, value)
    db.commit()
    db.refresh(order)
    return order


@router.post("/{order_id}/confirm", response_model=SalesOrderOut)
def confirm_sales_order(
    order_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(_write),
):
    order = db.query(SalesOrder).filter(SalesOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Sales order not found")
    if order.status != SalesOrderStatus.draft:
        raise HTTPException(status_code=400, detail="Order is not in draft state")

    for line in order.lines:
        product = db.query(Product).filter(Product.id == line.product_id).first()
        free_qty = float(product.on_hand_qty) - float(product.reserved_qty)
        qty_needed = float(line.qty_ordered)

        if free_qty >= qty_needed:
            # Sufficient stock — reserve and deliver from stock (MTS & MTO both)
            reserve_stock(db, product, Decimal(str(line.qty_ordered)))
        else:
            # Reserve whatever is available
            if free_qty > 0:
                reserve_stock(db, product, Decimal(str(free_qty)))
            shortage = Decimal(str(qty_needed - free_qty))
            # Only MTO products trigger auto-procurement on demand shortage
            # MTS products are pre-stocked via reorder checks, not on SO confirm
            if shortage > 0 and product.procure_on_demand and product.procurement_strategy == ProcurementStrategy.mto:
                trigger_procurement(db, product, shortage, origin_ref=order.name, current_user=current_user)

    order.status = SalesOrderStatus.confirmed
    db.commit()
    db.refresh(order)
    log_action(db, "CONFIRM", "sales_order", order.id, order.name, user_id=current_user.id)
    db.commit()
    return order


@router.post("/{order_id}/deliver", response_model=SalesOrderOut)
def deliver_sales_order(
    order_id: UUID,
    payload: DeliverRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(_write),
):
    order = db.query(SalesOrder).filter(SalesOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Sales order not found")
    if order.status not in (SalesOrderStatus.confirmed, SalesOrderStatus.partially_delivered):
        raise HTTPException(status_code=400, detail="Order must be confirmed before delivery")

    line_map = {line.id: line for line in order.lines}
    for deliver in payload.lines:
        line = line_map.get(deliver.line_id)
        if not line:
            raise HTTPException(status_code=404, detail=f"Line {deliver.line_id} not found")
        product = db.query(Product).filter(Product.id == line.product_id).first()
        qty = deliver.qty
        if qty <= 0:
            raise HTTPException(status_code=400, detail="Delivery qty must be positive")
        if float(qty) > float(line.qty_remaining):
            raise HTTPException(status_code=400, detail=f"Cannot deliver more than remaining qty for line {deliver.line_id}")
        if float(qty) > float(product.on_hand_qty):
            raise HTTPException(status_code=400, detail=f"Insufficient stock for {product.name}: only {float(product.on_hand_qty):.2f} units available")

        release_reservation(db, product, qty)
        record_movement(
            db, product, MovementType.sale_delivery, -qty,
            reference_type="sales_order", reference_id=order.id,
            notes=f"Delivery for {order.name}", created_by=current_user.id,
        )
        line.qty_delivered = Decimal(str(line.qty_delivered)) + qty

    # Update order status
    all_delivered = all(float(l.qty_remaining) <= 0 for l in order.lines)
    any_delivered = any(float(l.qty_delivered) > 0 for l in order.lines)
    if all_delivered:
        order.status = SalesOrderStatus.fully_delivered
    elif any_delivered:
        order.status = SalesOrderStatus.partially_delivered

    db.commit()
    db.refresh(order)
    log_action(db, "DELIVER", "sales_order", order.id, order.name, user_id=current_user.id)
    db.commit()
    return order


@router.post("/{order_id}/cancel", response_model=SalesOrderOut)
def cancel_sales_order(
    order_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(_write),
):
    order = db.query(SalesOrder).filter(SalesOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Sales order not found")
    if order.status in (SalesOrderStatus.fully_delivered, SalesOrderStatus.cancelled):
        raise HTTPException(status_code=400, detail="Cannot cancel this order")

    if order.status in (SalesOrderStatus.confirmed, SalesOrderStatus.partially_delivered):
        for line in order.lines:
            product = db.query(Product).filter(Product.id == line.product_id).first()
            remaining = Decimal(str(line.qty_ordered)) - Decimal(str(line.qty_delivered))
            if remaining > 0:
                release_reservation(db, product, remaining)

    order.status = SalesOrderStatus.cancelled
    db.commit()
    db.refresh(order)
    log_action(db, "CANCEL", "sales_order", order.id, order.name, user_id=current_user.id)
    db.commit()
    return order
