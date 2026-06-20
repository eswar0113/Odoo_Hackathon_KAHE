import uuid
import enum
from sqlalchemy import (
    Column, String, Numeric, Integer, DateTime, ForeignKey,
    Enum as SAEnum, Text, Date
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class MOStatus(str, enum.Enum):
    draft = "draft"
    confirmed = "confirmed"
    in_progress = "in_progress"
    done = "done"
    cancelled = "cancelled"


class WorkOrderStatus(str, enum.Enum):
    pending = "pending"
    in_progress = "in_progress"
    done = "done"


class WorkCenter(Base):
    __tablename__ = "work_centers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class BOM(Base):
    __tablename__ = "boms"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=False)
    product = relationship("Product", foreign_keys=[product_id])

    name = Column(String(255), nullable=False)
    version = Column(String(20), default="1.0")
    is_active = Column(String(1), default="Y")   # "Y" / "N"
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    lines = relationship("BOMLine", back_populates="bom", cascade="all, delete-orphan")
    operations = relationship("BOMOperation", back_populates="bom", cascade="all, delete-orphan")


class BOMLine(Base):
    """A single component in a Bill of Materials."""
    __tablename__ = "bom_lines"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    bom_id = Column(UUID(as_uuid=True), ForeignKey("boms.id"), nullable=False)
    bom = relationship("BOM", back_populates="lines")

    component_id = Column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=False)
    component = relationship("Product", foreign_keys=[component_id])

    qty = Column(Numeric(12, 3), nullable=False)


class BOMOperation(Base):
    """A manufacturing operation step defined in a BoM."""
    __tablename__ = "bom_operations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    bom_id = Column(UUID(as_uuid=True), ForeignKey("boms.id"), nullable=False)
    bom = relationship("BOM", back_populates="operations")

    operation_name = Column(String(255), nullable=False)
    work_center_id = Column(UUID(as_uuid=True), ForeignKey("work_centers.id"), nullable=True)
    work_center = relationship("WorkCenter")
    duration_minutes = Column(Integer, default=0)
    sequence = Column(Integer, default=10)


class ManufacturingOrder(Base):
    __tablename__ = "manufacturing_orders"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(50), unique=True, nullable=False)   # e.g. MO-0001

    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=False)
    product = relationship("Product", foreign_keys=[product_id])

    bom_id = Column(UUID(as_uuid=True), ForeignKey("boms.id"), nullable=True)
    bom = relationship("BOM")

    qty_planned = Column(Numeric(12, 3), nullable=False)
    qty_produced = Column(Numeric(12, 3), default=0)

    status = Column(SAEnum(MOStatus), default=MOStatus.draft, nullable=False)
    scheduled_date = Column(Date, nullable=True)

    # Links back to the sales order that triggered this (for MTO)
    origin_ref = Column(String(100), nullable=True)

    assignee_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    components = relationship(
        "ManufacturingOrderComponent",
        back_populates="mo",
        cascade="all, delete-orphan",
    )
    work_orders = relationship("WorkOrder", back_populates="mo", cascade="all, delete-orphan")


class ManufacturingOrderComponent(Base):
    """Snapshot of components needed for a Manufacturing Order."""
    __tablename__ = "manufacturing_order_components"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    mo_id = Column(UUID(as_uuid=True), ForeignKey("manufacturing_orders.id"), nullable=False)
    mo = relationship("ManufacturingOrder", back_populates="components")

    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=False)
    product = relationship("Product")

    qty_planned = Column(Numeric(12, 3), nullable=False)
    qty_consumed = Column(Numeric(12, 3), default=0)


class WorkOrder(Base):
    """Individual operation step within a Manufacturing Order."""
    __tablename__ = "work_orders"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    mo_id = Column(UUID(as_uuid=True), ForeignKey("manufacturing_orders.id"), nullable=False)
    mo = relationship("ManufacturingOrder", back_populates="work_orders")

    operation_name = Column(String(255), nullable=False)
    work_center_id = Column(UUID(as_uuid=True), ForeignKey("work_centers.id"), nullable=True)
    work_center = relationship("WorkCenter")
    duration_minutes = Column(Integer, default=0)
    sequence = Column(Integer, default=10)

    status = Column(SAEnum(WorkOrderStatus), default=WorkOrderStatus.pending, nullable=False)
    assignee_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
