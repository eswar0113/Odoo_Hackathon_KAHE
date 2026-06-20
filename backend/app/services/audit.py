from typing import Optional, Any
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.audit import AuditLog


def log_action(
    db: Session,
    action: str,
    entity_type: str,
    entity_id: Optional[UUID] = None,
    entity_name: Optional[str] = None,
    old_values: Optional[dict] = None,
    new_values: Optional[dict] = None,
    notes: Optional[str] = None,
    user_id: Optional[UUID] = None,
) -> AuditLog:
    entry = AuditLog(
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        entity_name=entity_name,
        old_values=old_values,
        new_values=new_values,
        notes=notes,
    )
    db.add(entry)
    return entry
