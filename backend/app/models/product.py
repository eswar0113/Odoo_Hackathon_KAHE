import uuid
import enum
from sqlalchemy import (
    Column, String, Numeric, Integer, Boolean, DateTime,
    ForeignKey, Enum as SAEnum, Text
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class ProcurementType(str, enum.Enum):
    purchase = "purchase"
    manufacturing = "manufacturing"


class ProcurementStrategy(str, enum.Enum):
    mts = "mts"   # Make To Stock
    mto = "mto"   # Make To Order


class MovementType(str, enum.Enum):
    sale_delivery = "sale_delivery"
    sale_return = "sale_return"
    purchase_receipt = "purchase_receipt"
    purchase_return = "purchase_return"
    manufacturing_consume = "manufacturing_consume"
    manufacturing_produce = "manufacturing_produce"
    adjustment = "adjustment"


class Product(Base):
    __tablename__ = "products"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(100), nullable=True)
    unit_of_measure = Column(String(50), default="pcs")
    sales_price = Column(Numeric(12, 2), nullable=False, default=0)
    cost_price = Column(Numeric(12, 2), nullable=False, default=0)
    tax_percent = Column(Numeric(5, 2), nullable=False, default=0)  # e.g. 18.00 for 18% GST

    # Stock quantities
    on_hand_qty = Column(Numeric(12, 3), nullable=False, default=0)
    reserved_qty = Column(Numeric(12, 3), nullable=False, default=0)

    # Procurement configuration
    procure_on_demand = Column(Boolean, default=False)
    procurement_type = Column(SAEnum(ProcurementType), nullable=True)
    procurement_strategy = Column(SAEnum(ProcurementStrategy), default=ProcurementStrategy.mts)

    # Reorder point for MTS
    reorder_point = Column(Numeric(12, 3), default=0)
    reorder_qty = Column(Numeric(12, 3), default=0)

    # FK to default vendor (for purchase-type procurement)
    vendor_id = Column(UUID(as_uuid=True), ForeignKey("vendors.id"), nullable=True)
    vendor = relationship("Vendor", foreign_keys=[vendor_id])

    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    @property
    def free_to_use_qty(self):
        return float(self.on_hand_qty) - float(self.reserved_qty)









class StockLedger(Base):
    __tablename__ = "stock_ledger"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=False)
    product = relationship("Product")

    movement_type = Column(SAEnum(MovementType), nullable=False)
    reference_type = Column(String(50), nullable=True)   # "sales_order", "purchase_order", "manufacturing_order"
    reference_id = Column(UUID(as_uuid=True), nullable=True)

    qty_change = Column(Numeric(12, 3), nullable=False)   # positive = in, negative = out
    qty_before = Column(Numeric(12, 3), nullable=False)
    qty_after = Column(Numeric(12, 3), nullable=False)

    notes = Column(Text, nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
