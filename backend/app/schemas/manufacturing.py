from uuid import UUID
from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel

from app.models.manufacturing import MOStatus, WorkOrderStatus


class WorkCenterCreate(BaseModel):
    name: str
    description: Optional[str] = None


class WorkCenterOut(BaseModel):
    id: UUID
    name: str
    description: Optional[str] = None

    model_config = {"from_attributes": True}


class BOMLineCreate(BaseModel):
    component_id: UUID
    qty: Decimal


class BOMLineOut(BaseModel):
    id: UUID
    component_id: UUID
    component_name: Optional[str] = None
    qty: Decimal

    model_config = {"from_attributes": True}


class BOMOperationCreate(BaseModel):
    operation_name: str
    work_center_id: Optional[UUID] = None
    duration_minutes: int = 0
    sequence: int = 10


class BOMOperationOut(BaseModel):
    id: UUID
    operation_name: str
    work_center_id: Optional[UUID] = None
    work_center_name: Optional[str] = None
    duration_minutes: int
    sequence: int

    model_config = {"from_attributes": True}


class BOMCreate(BaseModel):
    product_id: UUID
    name: str
    version: str = "1.0"
    lines: List[BOMLineCreate] = []
    operations: List[BOMOperationCreate] = []


class BOMUpdate(BaseModel):
    name: Optional[str] = None
    version: Optional[str] = None
    is_active: Optional[str] = None
    lines: Optional[List[BOMLineCreate]] = None
    operations: Optional[List[BOMOperationCreate]] = None


class BOMOut(BaseModel):
    id: UUID
    product_id: UUID
    name: str
    version: str
    is_active: str
    lines: List[BOMLineOut] = []
    operations: List[BOMOperationOut] = []
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class MOCreate(BaseModel):
    product_id: UUID
    bom_id: Optional[UUID] = None
    qty_planned: Decimal
    scheduled_date: Optional[date] = None
    origin_ref: Optional[str] = None
    assignee_id: Optional[UUID] = None


class MOComponentOut(BaseModel):
    id: UUID
    product_id: UUID
    product_name: Optional[str] = None
    qty_planned: Decimal
    qty_consumed: Decimal

    model_config = {"from_attributes": True}


class WorkOrderOut(BaseModel):
    id: UUID
    operation_name: str
    work_center_id: Optional[UUID] = None
    work_center_name: Optional[str] = None
    duration_minutes: int
    sequence: int
    status: WorkOrderStatus
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class MOOut(BaseModel):
    id: UUID
    name: str
    product_id: UUID
    product_name: Optional[str] = None
    bom_id: Optional[UUID] = None
    qty_planned: Decimal
    qty_produced: Decimal
    status: MOStatus
    scheduled_date: Optional[date] = None
    origin_ref: Optional[str] = None
    assignee_id: Optional[UUID] = None
    assignee_name: Optional[str] = None
    components: List[MOComponentOut] = []
    work_orders: List[WorkOrderOut] = []
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
