from datetime import datetime, timezone
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.manufacturing import (
    WorkCenter, BOM, BOMLine, BOMOperation,
    ManufacturingOrder, ManufacturingOrderComponent, WorkOrder,
    MOStatus, WorkOrderStatus,
)
from app.models.product import Product, MovementType
from app.models.user import User, UserRole
from app.schemas.manufacturing import (
    WorkCenterCreate, WorkCenterOut,
    BOMCreate, BOMUpdate, BOMOut, BOMLineOut, BOMOperationOut,
    MOCreate, MOOut, MOComponentOut, WorkOrderOut,
)
from app.core.deps import get_current_user, require_roles
from app.services.stock import record_movement, reserve_stock, release_reservation
from app.services.audit import log_action
from app.services.sequence import next_mo_name

router = APIRouter(prefix="/api/manufacturing", tags=["Manufacturing"])
_write = require_roles(UserRole.manufacturing, UserRole.owner, UserRole.admin)

# ── Work Centers ──────────────────────────────────────────────────────────────

@router.post("/work-centers", response_model=WorkCenterOut, status_code=201)
def create_work_center(payload: WorkCenterCreate, db: Session = Depends(get_db), _: User = Depends(_write)):
    wc = WorkCenter(**payload.model_dump())
    db.add(wc)
    db.commit()
    db.refresh(wc)
    return wc


@router.get("/work-centers", response_model=List[WorkCenterOut])
def list_work_centers(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.query(WorkCenter).order_by(WorkCenter.name).all()

# ── Bill of Materials ─────────────────────────────────────────────────────────

@router.post("/boms", response_model=BOMOut, status_code=201)
def create_bom(payload: BOMCreate, db: Session = Depends(get_db), current_user: User = Depends(_write)):
    bom = BOM(product_id=payload.product_id, name=payload.name, version=payload.version)
    db.add(bom)
    db.flush()

    for line_data in payload.lines:
        db.add(BOMLine(bom_id=bom.id, component_id=line_data.component_id, qty=line_data.qty))
    for op_data in payload.operations:
        db.add(BOMOperation(bom_id=bom.id, **op_data.model_dump()))

    db.commit()
    db.refresh(bom)
    log_action(db, "CREATE", "bom", bom.id, bom.name, user_id=current_user.id)
    db.commit()
    return _bom_out(bom)


@router.get("/boms", response_model=List[BOMOut])
def list_boms(
    product_id: Optional[UUID] = Query(None),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.query(BOM)
    if product_id:
        q = q.filter(BOM.product_id == product_id)
    boms = q.order_by(BOM.created_at.desc()).all()
    return [_bom_out(b) for b in boms]


@router.get("/boms/{bom_id}", response_model=BOMOut)
def get_bom(bom_id: UUID, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    bom = db.query(BOM).filter(BOM.id == bom_id).first()
    if not bom:
        raise HTTPException(status_code=404, detail="BoM not found")
    return _bom_out(bom)


@router.put("/boms/{bom_id}", response_model=BOMOut)
def update_bom(bom_id: UUID, payload: BOMUpdate, db: Session = Depends(get_db), current_user: User = Depends(_write)):
    bom = db.query(BOM).filter(BOM.id == bom_id).first()
    if not bom:
        raise HTTPException(status_code=404, detail="BoM not found")
    if payload.name is not None:
        bom.name = payload.name
    if payload.version is not None:
        bom.version = payload.version
    if payload.is_active is not None:
        bom.is_active = payload.is_active
    if payload.lines is not None:
        for existing in bom.lines:
            db.delete(existing)
        db.flush()
        for line_data in payload.lines:
            db.add(BOMLine(bom_id=bom.id, component_id=line_data.component_id, qty=line_data.qty))
    if payload.operations is not None:
        for existing in bom.operations:
            db.delete(existing)
        db.flush()
        for op_data in payload.operations:
            db.add(BOMOperation(bom_id=bom.id, **op_data.model_dump()))
    db.commit()
    db.refresh(bom)
    log_action(db, "UPDATE", "bom", bom.id, bom.name, user_id=current_user.id)
    db.commit()
    return _bom_out(bom)

# ── Manufacturing Orders ──────────────────────────────────────────────────────

@router.post("/orders", response_model=MOOut, status_code=201)
def create_mo(payload: MOCreate, db: Session = Depends(get_db), current_user: User = Depends(_write)):
    bom = None
    if payload.bom_id:
        bom = db.query(BOM).filter(BOM.id == payload.bom_id).first()
        if not bom:
            raise HTTPException(status_code=404, detail="BoM not found")
    elif payload.product_id:
        bom = db.query(BOM).filter(BOM.product_id == payload.product_id, BOM.is_active == "Y").first()

    mo = ManufacturingOrder(
        name=next_mo_name(db),
        product_id=payload.product_id,
        bom_id=bom.id if bom else None,
        qty_planned=payload.qty_planned,
        scheduled_date=payload.scheduled_date,
        origin_ref=payload.origin_ref,
        assignee_id=payload.assignee_id,
        created_by=current_user.id,
    )
    db.add(mo)
    db.flush()

    if bom:
        for bom_line in bom.lines:
            db.add(ManufacturingOrderComponent(
                mo_id=mo.id,
                product_id=bom_line.component_id,
                qty_planned=Decimal(str(bom_line.qty)) * payload.qty_planned,
            ))
        for op in sorted(bom.operations, key=lambda x: x.sequence):
            db.add(WorkOrder(
                mo_id=mo.id,
                operation_name=op.operation_name,
                work_center_id=op.work_center_id,
                duration_minutes=op.duration_minutes,
                sequence=op.sequence,
            ))

    db.commit()
    db.refresh(mo)
    log_action(db, "CREATE", "manufacturing_order", mo.id, mo.name, user_id=current_user.id)
    db.commit()
    return _mo_out(mo, db)


@router.get("/orders", response_model=List[MOOut])
def list_mos(
    status: Optional[MOStatus] = Query(None),
    product_id: Optional[UUID] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.query(ManufacturingOrder)
    if status:
        q = q.filter(ManufacturingOrder.status == status)
    if product_id:
        q = q.filter(ManufacturingOrder.product_id == product_id)
    mos = q.order_by(ManufacturingOrder.created_at.desc()).offset(skip).limit(limit).all()
    return [_mo_out(mo, db) for mo in mos]


@router.get("/orders/{mo_id}", response_model=MOOut)
def get_mo(mo_id: UUID, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    mo = db.query(ManufacturingOrder).filter(ManufacturingOrder.id == mo_id).first()
    if not mo:
        raise HTTPException(status_code=404, detail="Manufacturing order not found")
    return _mo_out(mo, db)


@router.post("/orders/{mo_id}/confirm", response_model=MOOut)
def confirm_mo(mo_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(_write)):
    mo = db.query(ManufacturingOrder).filter(ManufacturingOrder.id == mo_id).first()
    if not mo:
        raise HTTPException(status_code=404, detail="Manufacturing order not found")
    if mo.status != MOStatus.draft:
        raise HTTPException(status_code=400, detail="MO is not in draft state")

    # Check and reserve component stock
    for comp in mo.components:
        product = db.query(Product).filter(Product.id == comp.product_id).first()
        free_qty = float(product.on_hand_qty) - float(product.reserved_qty)
        if free_qty < float(comp.qty_planned):
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock for component '{product.name}': need {float(comp.qty_planned):.2f}, only {free_qty:.2f} free"
            )
        reserve_stock(db, product, comp.qty_planned)

    mo.status = MOStatus.confirmed
    db.commit()
    db.refresh(mo)
    log_action(db, "CONFIRM", "manufacturing_order", mo.id, mo.name, user_id=current_user.id)
    db.commit()
    return _mo_out(mo, db)


@router.post("/orders/{mo_id}/start", response_model=MOOut)
def start_mo(mo_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(_write)):
    mo = db.query(ManufacturingOrder).filter(ManufacturingOrder.id == mo_id).first()
    if not mo:
        raise HTTPException(status_code=404, detail="Manufacturing order not found")
    if mo.status != MOStatus.confirmed:
        raise HTTPException(status_code=400, detail="MO must be confirmed before starting")
    mo.status = MOStatus.in_progress
    db.commit()
    db.refresh(mo)
    log_action(db, "START", "manufacturing_order", mo.id, mo.name, user_id=current_user.id)
    db.commit()
    return _mo_out(mo, db)


@router.post("/orders/{mo_id}/produce", response_model=MOOut)
def produce_mo(mo_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(_write)):
    """Mark manufacturing order as done: consume components and produce finished goods."""
    mo = db.query(ManufacturingOrder).filter(ManufacturingOrder.id == mo_id).first()
    if not mo:
        raise HTTPException(status_code=404, detail="Manufacturing order not found")
    if mo.status != MOStatus.in_progress:
        raise HTTPException(status_code=400, detail="MO must be in progress to produce")
    pending_wos = [wo for wo in mo.work_orders if wo.status != WorkOrderStatus.done]
    if pending_wos:
        raise HTTPException(
            status_code=400,
            detail=f"{len(pending_wos)} work order(s) not yet completed. Complete all work orders before marking produced."
        )

    # Consume components
    for comp in mo.components:
        product = db.query(Product).filter(Product.id == comp.product_id).first()
        qty_to_consume = comp.qty_planned - comp.qty_consumed
        release_reservation(db, product, qty_to_consume)
        record_movement(
            db, product, MovementType.manufacturing_consume, -qty_to_consume,
            reference_type="manufacturing_order", reference_id=mo.id,
            notes=f"Component consumed for {mo.name}", created_by=current_user.id,
        )
        comp.qty_consumed = comp.qty_planned

    # Produce finished goods
    finished = db.query(Product).filter(Product.id == mo.product_id).first()
    record_movement(
        db, finished, MovementType.manufacturing_produce, mo.qty_planned,
        reference_type="manufacturing_order", reference_id=mo.id,
        notes=f"Finished goods produced for {mo.name}", created_by=current_user.id,
    )
    mo.qty_produced = mo.qty_planned
    mo.status = MOStatus.done

    db.commit()
    db.refresh(mo)
    log_action(db, "PRODUCE", "manufacturing_order", mo.id, mo.name, user_id=current_user.id)
    db.commit()
    return _mo_out(mo, db)


@router.post("/orders/{mo_id}/cancel", response_model=MOOut)
def cancel_mo(mo_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(_write)):
    mo = db.query(ManufacturingOrder).filter(ManufacturingOrder.id == mo_id).first()
    if not mo:
        raise HTTPException(status_code=404, detail="Manufacturing order not found")
    if mo.status in (MOStatus.done, MOStatus.cancelled):
        raise HTTPException(status_code=400, detail="Cannot cancel this MO")
    if mo.status in (MOStatus.confirmed, MOStatus.in_progress):
        for comp in mo.components:
            product = db.query(Product).filter(Product.id == comp.product_id).first()
            remaining = Decimal(str(comp.qty_planned)) - Decimal(str(comp.qty_consumed))
            release_reservation(db, product, remaining)
    mo.status = MOStatus.cancelled
    db.commit()
    db.refresh(mo)
    log_action(db, "CANCEL", "manufacturing_order", mo.id, mo.name, user_id=current_user.id)
    db.commit()
    return _mo_out(mo, db)


# ── Work Orders ───────────────────────────────────────────────────────────────

@router.post("/orders/{mo_id}/work-orders/{wo_id}/start", response_model=WorkOrderOut)
def start_work_order(mo_id: UUID, wo_id: UUID, db: Session = Depends(get_db), _: User = Depends(_write)):
    wo = db.query(WorkOrder).filter(WorkOrder.id == wo_id, WorkOrder.mo_id == mo_id).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Work order not found")
    if wo.status != WorkOrderStatus.pending:
        raise HTTPException(status_code=400, detail="Work order is not pending")
    wo.status = WorkOrderStatus.in_progress
    wo.started_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(wo)
    return _wo_out(wo)


@router.post("/orders/{mo_id}/work-orders/{wo_id}/done", response_model=WorkOrderOut)
def finish_work_order(mo_id: UUID, wo_id: UUID, db: Session = Depends(get_db), _: User = Depends(_write)):
    wo = db.query(WorkOrder).filter(WorkOrder.id == wo_id, WorkOrder.mo_id == mo_id).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Work order not found")
    if wo.status != WorkOrderStatus.in_progress:
        raise HTTPException(status_code=400, detail="Work order is not in progress")
    wo.status = WorkOrderStatus.done
    wo.completed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(wo)
    return _wo_out(wo)


# ── Helper serializers ────────────────────────────────────────────────────────

def _bom_out(bom: BOM) -> BOMOut:
    lines = [
        BOMLineOut(
            id=l.id,
            component_id=l.component_id,
            component_name=l.component.name if l.component else None,
            qty=l.qty,
        )
        for l in bom.lines
    ]
    ops = [
        BOMOperationOut(
            id=o.id,
            operation_name=o.operation_name,
            work_center_id=o.work_center_id,
            work_center_name=o.work_center.name if o.work_center else None,
            duration_minutes=o.duration_minutes,
            sequence=o.sequence,
        )
        for o in bom.operations
    ]
    return BOMOut(
        id=bom.id,
        product_id=bom.product_id,
        name=bom.name,
        version=bom.version,
        is_active=bom.is_active,
        lines=lines,
        operations=ops,
        created_at=bom.created_at,
    )


def _mo_out(mo: ManufacturingOrder, db: Session) -> MOOut:
    product = db.query(Product).filter(Product.id == mo.product_id).first()
    assignee = db.query(User).filter(User.id == mo.assignee_id).first() if mo.assignee_id else None
    components = [
        MOComponentOut(
            id=c.id,
            product_id=c.product_id,
            product_name=c.product.name if c.product else None,
            qty_planned=c.qty_planned,
            qty_consumed=c.qty_consumed,
        )
        for c in mo.components
    ]
    work_orders = [_wo_out(wo) for wo in sorted(mo.work_orders, key=lambda x: x.sequence)]
    return MOOut(
        id=mo.id,
        name=mo.name,
        product_id=mo.product_id,
        product_name=product.name if product else None,
        bom_id=mo.bom_id,
        qty_planned=mo.qty_planned,
        qty_produced=mo.qty_produced,
        status=mo.status,
        scheduled_date=mo.scheduled_date,
        origin_ref=mo.origin_ref,
        assignee_id=mo.assignee_id,
        assignee_name=assignee.full_name if assignee else None,
        components=components,
        work_orders=work_orders,
        created_at=mo.created_at,
    )


def _wo_out(wo: WorkOrder) -> WorkOrderOut:
    wc_name = wo.work_center.name if wo.work_center else None
    return WorkOrderOut(
        id=wo.id,
        operation_name=wo.operation_name,
        work_center_id=wo.work_center_id,
        work_center_name=wc_name,
        duration_minutes=wo.duration_minutes,
        sequence=wo.sequence,
        status=wo.status,
        started_at=wo.started_at,
        completed_at=wo.completed_at,
    )
