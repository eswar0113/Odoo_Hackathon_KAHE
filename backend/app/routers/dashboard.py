from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel

from app.database import get_db
from app.models.sales import SalesOrder, SalesOrderStatus
from app.models.purchase import PurchaseOrder, PurchaseOrderStatus
from app.models.manufacturing import ManufacturingOrder, MOStatus
from app.models.user import User
from app.core.deps import get_current_user

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


class DashboardStats(BaseModel):
    total_sales_orders: int
    pending_deliveries: int
    total_purchase_orders: int
    partial_receipts: int
    total_manufacturing_orders: int
    in_progress_mos: int
    done_mos: int


@router.get("", response_model=DashboardStats)
def get_dashboard(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    so_total = db.query(func.count(SalesOrder.id)).scalar() or 0
    so_pending = db.query(func.count(SalesOrder.id)).filter(
        SalesOrder.status.in_([SalesOrderStatus.confirmed, SalesOrderStatus.partially_delivered])
    ).scalar() or 0

    po_total = db.query(func.count(PurchaseOrder.id)).scalar() or 0
    po_partial = db.query(func.count(PurchaseOrder.id)).filter(
        PurchaseOrder.status == PurchaseOrderStatus.partially_received
    ).scalar() or 0

    mo_total = db.query(func.count(ManufacturingOrder.id)).scalar() or 0
    mo_in_progress = db.query(func.count(ManufacturingOrder.id)).filter(
        ManufacturingOrder.status == MOStatus.in_progress
    ).scalar() or 0
    mo_done = db.query(func.count(ManufacturingOrder.id)).filter(
        ManufacturingOrder.status == MOStatus.done
    ).scalar() or 0

    return DashboardStats(
        total_sales_orders=so_total,
        pending_deliveries=so_pending,
        total_purchase_orders=po_total,
        partial_receipts=po_partial,
        total_manufacturing_orders=mo_total,
        in_progress_mos=mo_in_progress,
        done_mos=mo_done,
    )
