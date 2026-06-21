from datetime import date
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from pydantic import BaseModel

from app.database import get_db
from app.models.product import Product
from app.models.sales import SalesOrder, SalesOrderStatus
from app.models.purchase import PurchaseOrder, PurchaseOrderStatus
from app.models.manufacturing import ManufacturingOrder, MOStatus
from app.models.user import User
from app.core.deps import get_current_user

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


class RecentSO(BaseModel):
    id: UUID
    name: str
    customer_name: Optional[str]
    status: str
    order_date: Optional[date]
    model_config = {"from_attributes": True}


class RecentPO(BaseModel):
    id: UUID
    name: str
    vendor_name: Optional[str]
    status: str
    order_date: Optional[date]
    model_config = {"from_attributes": True}


class RecentMO(BaseModel):
    id: UUID
    name: str
    product_name: Optional[str]
    status: str
    scheduled_date: Optional[date]
    model_config = {"from_attributes": True}


class DashboardStats(BaseModel):
    total_sales_orders: int
    pending_deliveries: int
    delayed_orders: int
    total_purchase_orders: int
    partial_receipts: int
    total_manufacturing_orders: int
    in_progress_mos: int
    done_mos: int
    low_stock_products: int
    recent_sales_orders: List[RecentSO] = []
    recent_purchase_orders: List[RecentPO] = []
    recent_manufacturing_orders: List[RecentMO] = []


@router.get("", response_model=DashboardStats)
def get_dashboard(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    today = date.today()

    so_total = db.query(func.count(SalesOrder.id)).scalar() or 0
    so_pending = db.query(func.count(SalesOrder.id)).filter(
        SalesOrder.status.in_([SalesOrderStatus.confirmed, SalesOrderStatus.partially_delivered])
    ).scalar() or 0
    so_delayed = db.query(func.count(SalesOrder.id)).filter(
        SalesOrder.status.in_([SalesOrderStatus.confirmed, SalesOrderStatus.partially_delivered]),
        SalesOrder.expected_delivery_date < today,
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

    products = db.query(Product).filter(Product.is_active == True).all()
    low_stock = sum(
        1 for p in products
        if float(p.on_hand_qty) - float(p.reserved_qty) < float(p.reorder_point)
    )

    recent_sos = db.query(SalesOrder).options(joinedload(SalesOrder.customer))\
        .order_by(SalesOrder.created_at.desc()).limit(5).all()
    recent_pos = db.query(PurchaseOrder).options(joinedload(PurchaseOrder.vendor))\
        .order_by(PurchaseOrder.created_at.desc()).limit(5).all()
    recent_mos = db.query(ManufacturingOrder).options(joinedload(ManufacturingOrder.product))\
        .order_by(ManufacturingOrder.created_at.desc()).limit(5).all()

    return DashboardStats(
        total_sales_orders=so_total,
        pending_deliveries=so_pending,
        delayed_orders=so_delayed,
        total_purchase_orders=po_total,
        partial_receipts=po_partial,
        total_manufacturing_orders=mo_total,
        in_progress_mos=mo_in_progress,
        done_mos=mo_done,
        low_stock_products=low_stock,
        recent_sales_orders=[
            RecentSO(id=o.id, name=o.name, customer_name=o.customer.name if o.customer else None,
                     status=o.status.value, order_date=o.order_date)
            for o in recent_sos
        ],
        recent_purchase_orders=[
            RecentPO(id=o.id, name=o.name, vendor_name=o.vendor.name if o.vendor else None,
                     status=o.status.value, order_date=o.order_date)
            for o in recent_pos
        ],
        recent_manufacturing_orders=[
            RecentMO(id=o.id, name=o.name, product_name=o.product.name if o.product else None,
                     status=o.status.value, scheduled_date=o.scheduled_date)
            for o in recent_mos
        ],
    )
