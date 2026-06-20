from typing import List, Optional
from uuid import UUID
from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models.audit import AuditLog
from app.models.user import User
from app.core.deps import require_admin, get_current_user

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
    entity_type: Optional[str] = Query(None),
    entity_id: Optional[UUID] = Query(None),
    limit: int = Query(100, le=500),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    q = db.query(AuditLog)
    if entity_type:
        q = q.filter(AuditLog.entity_type == entity_type)
    if entity_id:
        q = q.filter(AuditLog.entity_id == entity_id)
    return q.order_by(AuditLog.created_at.desc()).limit(limit).all()
