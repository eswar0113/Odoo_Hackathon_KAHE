from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.sales import SalesOrder
from app.models.purchase import PurchaseOrder
from app.models.manufacturing import ManufacturingOrder


def next_so_name(db: Session) -> str:
    count = db.query(func.count(SalesOrder.id)).scalar() or 0
    return f"SO-{count + 1:04d}"


def next_po_name(db: Session) -> str:
    count = db.query(func.count(PurchaseOrder.id)).scalar() or 0
    return f"PO-{count + 1:04d}"


def next_mo_name(db: Session) -> str:
    count = db.query(func.count(ManufacturingOrder.id)).scalar() or 0
    return f"MO-{count + 1:04d}"
