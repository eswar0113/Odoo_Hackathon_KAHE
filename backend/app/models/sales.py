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


class SalesOrderStatus(str, enum.Enum):
    draft = "draft"
    confirmed = "confirmed"
    partially_delivered = "partially_delivered"
    fully_delivered = "fully_delivered"
    cancelled = "cancelled"


class SalesOrder(Base):
    __tablename__ = "sales_orders"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(50), unique=True, nullable=False)   # e.g. SO-0001
    customer_id = Column(UUID(as_uuid=True), ForeignKey("customers.id"), nullable=False)
    customer = relationship("Customer")

    status = Column(SAEnum(SalesOrderStatus), default=SalesOrderStatus.draft, nullable=False)
    order_date = Column(Date, nullable=False)
    expected_delivery_date = Column(Date, nullable=True)
    notes = Column(Text, nullable=True)

    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    lines = relationship("SalesOrderLine", back_populates="order", cascade="all, delete-orphan")


class SalesOrderLine(Base):
    __tablename__ = "sales_order_lines"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = Column(UUID(as_uuid=True), ForeignKey("sales_orders.id"), nullable=False)
    order = relationship("SalesOrder", back_populates="lines")

    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=False)
    product = relationship("Product")

    qty_ordered = Column(Numeric(12, 3), nullable=False)
    qty_delivered = Column(Numeric(12, 3), default=0)
    unit_price = Column(Numeric(12, 2), nullable=False)

    @property
    def subtotal(self):
        return float(self.qty_ordered) * float(self.unit_price)

    @property
    def qty_remaining(self):
        return float(self.qty_ordered) - float(self.qty_delivered)
