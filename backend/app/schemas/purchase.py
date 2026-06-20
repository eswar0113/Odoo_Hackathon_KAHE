from uuid import UUID
from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel

from app.models.purchase import PurchaseOrderStatus
from app.schemas.vendor import VendorOut
from app.schemas.product import ProductOut


class PurchaseOrderLineCreate(BaseModel):
    product_id: UUID
    qty_ordered: Decimal
    unit_price: Decimal


class PurchaseOrderLineOut(BaseModel):
    id: UUID
    product_id: UUID
    product: Optional[ProductOut] = None
    qty_ordered: Decimal
    qty_received: Decimal
    unit_price: Decimal
    subtotal: float
    qty_remaining: float

    model_config = {"from_attributes": True}


class PurchaseOrderCreate(BaseModel):
    vendor_id: UUID
    order_date: date
    expected_date: Optional[date] = None
    notes: Optional[str] = None
    origin_ref: Optional[str] = None
    lines: List[PurchaseOrderLineCreate]


class PurchaseOrderUpdate(BaseModel):
    expected_date: Optional[date] = None
    notes: Optional[str] = None


class ReceiveLine(BaseModel):
    line_id: UUID
    qty: Decimal


class ReceiveRequest(BaseModel):
    lines: List[ReceiveLine]


class PurchaseOrderOut(BaseModel):
    id: UUID
    name: str
    vendor_id: UUID
    vendor: Optional[VendorOut] = None
    status: PurchaseOrderStatus
    order_date: date
    expected_date: Optional[date] = None
    notes: Optional[str] = None
    origin_ref: Optional[str] = None
    lines: List[PurchaseOrderLineOut] = []
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
