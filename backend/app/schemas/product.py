from uuid import UUID
from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, computed_field

from app.models.product import ProcurementType, ProcurementStrategy, MovementType


class ProductCreate(BaseModel):
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    unit_of_measure: str = "pcs"
    sales_price: Decimal
    cost_price: Decimal
    on_hand_qty: Decimal = Decimal("0")
    procure_on_demand: bool = False
    procurement_type: Optional[ProcurementType] = None
    procurement_strategy: ProcurementStrategy = ProcurementStrategy.mts
    reorder_point: Decimal = Decimal("0")
    reorder_qty: Decimal = Decimal("0")
    vendor_id: Optional[UUID] = None


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    unit_of_measure: Optional[str] = None
    sales_price: Optional[Decimal] = None
    cost_price: Optional[Decimal] = None
    procure_on_demand: Optional[bool] = None
    procurement_type: Optional[ProcurementType] = None
    procurement_strategy: Optional[ProcurementStrategy] = None
    reorder_point: Optional[Decimal] = None
    reorder_qty: Optional[Decimal] = None
    vendor_id: Optional[UUID] = None
    is_active: Optional[bool] = None


class ProductOut(BaseModel):
    id: UUID
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    unit_of_measure: str
    sales_price: Decimal
    cost_price: Decimal
    on_hand_qty: Decimal
    reserved_qty: Decimal
    free_to_use_qty: float
    procure_on_demand: bool
    procurement_type: Optional[ProcurementType] = None
    procurement_strategy: ProcurementStrategy
    reorder_point: Decimal
    reorder_qty: Decimal
    vendor_id: Optional[UUID] = None
    is_active: bool
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class StockAdjustment(BaseModel):
    qty: Decimal
    notes: Optional[str] = None


class StockLedgerOut(BaseModel):
    id: UUID
    product_id: UUID
    movement_type: MovementType
    reference_type: Optional[str] = None
    reference_id: Optional[UUID] = None
    qty_change: Decimal
    qty_before: Decimal
    qty_after: Decimal
    notes: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
