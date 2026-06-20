from uuid import UUID
from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel

from app.models.sales import SalesOrderStatus
from app.schemas.customer import CustomerOut
from app.schemas.product import ProductOut


class SalesOrderLineCreate(BaseModel):
    product_id: UUID
    qty_ordered: Decimal
    unit_price: Decimal


class SalesOrderLineOut(BaseModel):
    id: UUID
    product_id: UUID
    product: Optional[ProductOut] = None
    qty_ordered: Decimal
    qty_delivered: Decimal
    unit_price: Decimal
    subtotal: float
    qty_remaining: float

    model_config = {"from_attributes": True}


class SalesOrderCreate(BaseModel):
    customer_id: UUID
    order_date: date
    expected_delivery_date: Optional[date] = None
    notes: Optional[str] = None
    lines: List[SalesOrderLineCreate]


class SalesOrderUpdate(BaseModel):
    expected_delivery_date: Optional[date] = None
    notes: Optional[str] = None


class DeliverLine(BaseModel):
    line_id: UUID
    qty: Decimal


class DeliverRequest(BaseModel):
    lines: List[DeliverLine]


class SalesOrderOut(BaseModel):
    id: UUID
    name: str
    customer_id: UUID
    customer: Optional[CustomerOut] = None
    status: SalesOrderStatus
    order_date: date
    expected_delivery_date: Optional[date] = None
    notes: Optional[str] = None
    lines: List[SalesOrderLineOut] = []
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
