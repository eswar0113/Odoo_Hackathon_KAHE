import uuid
import enum
from sqlalchemy import (
    Column, String, Numeric, DateTime, ForeignKey,
    Enum as SAEnum, Text, Date
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class PurchaseOrderStatus(str, enum.Enum):
    draft = "draft"
    confirmed = "confirmed"
    partially_received = "partially_received"
    fully_received = "fully_received"
    cancelled = "cancelled"


class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(50), unique=True, nullable=False)   # e.g. PO-0001
    vendor_id = Column(UUID(as_uuid=True), ForeignKey("vendors.id"), nullable=False)
    vendor = relationship("Vendor")

    status = Column(SAEnum(PurchaseOrderStatus), default=PurchaseOrderStatus.draft, nullable=False)
    order_date = Column(Date, nullable=False)
    expected_date = Column(Date, nullable=True)
    notes = Column(Text, nullable=True)

    # Links back to the sales order that triggered this (for MTO)
    origin_ref = Column(String(100), nullable=True)

    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    lines = relationship("PurchaseOrderLine", back_populates="order", cascade="all, delete-orphan")


class PurchaseOrderLine(Base):
    __tablename__ = "purchase_order_lines"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = Column(UUID(as_uuid=True), ForeignKey("purchase_orders.id"), nullable=False)
    order = relationship("PurchaseOrder", back_populates="lines")

    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=False)
    product = relationship("Product")

    qty_ordered = Column(Numeric(12, 3), nullable=False)
    qty_received = Column(Numeric(12, 3), default=0)
    unit_price = Column(Numeric(12, 2), nullable=False)

    @property
    def subtotal(self):
        return float(self.qty_ordered) * float(self.unit_price)

    @property
    def qty_remaining(self):
        return float(self.qty_ordered) - float(self.qty_received)
