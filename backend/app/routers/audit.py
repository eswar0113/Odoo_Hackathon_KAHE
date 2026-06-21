from datetime import date, timedelta
from typing import List, Optional
from uuid import UUID
from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models.audit import AuditLog
from app.models.user import User
from app.core.deps import require_admin

router = APIRouter(prefix="/api/audit", tags=["Audit"])


class AuditLogOut(BaseModel):
    id: UUID
    user_id: Optional[UUID] = None
    action: str
    entity_type: str
    entity_id: Optional[UUID] = None
    entity_name: Optional[str] = None
    old_values: Optional[dict] = None
    new_values: Optional[dict] = None
    notes: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


@router.get("", response_model=List[AuditLogOut])
def list_audit_logs(
    entity_type: Optional[str] = Query(None, description="e.g. product, sales_order, purchase_order"),
    entity_id: Optional[UUID] = Query(None),
    entity_name: Optional[str] = Query(None, description="Search by name, e.g. 'Wood Plank' or 'SO-0001'"),
    action: Optional[str] = Query(None, description="e.g. CREATE, UPDATE, CONFIRM, DELIVER, CANCEL"),
    user_id: Optional[UUID] = Query(None, description="Filter by the user who performed the action"),
    date_from: Optional[date] = Query(None, description="Filter logs from this date (inclusive)"),
    date_to: Optional[date] = Query(None, description="Filter logs up to this date (inclusive)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    q = db.query(AuditLog)
    if entity_type:
        q = q.filter(AuditLog.entity_type == entity_type)
    if entity_id:
        q = q.filter(AuditLog.entity_id == entity_id)
    if entity_name:
        q = q.filter(AuditLog.entity_name.ilike(f"%{entity_name}%"))
    if action:
        q = q.filter(AuditLog.action == action.upper())
    if user_id:
        q = q.filter(AuditLog.user_id == user_id)
    if date_from:
        q = q.filter(AuditLog.created_at >= date_from)
    if date_to:
        q = q.filter(AuditLog.created_at < date_to + timedelta(days=1))
    return q.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit).all()
