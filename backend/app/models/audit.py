import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    user = relationship("User")

    action = Column(String(100), nullable=False)       # CREATE, UPDATE, DELETE, CONFIRM, DELIVER, etc.
    entity_type = Column(String(100), nullable=False)  # "sales_order", "purchase_order", etc.
    entity_id = Column(UUID(as_uuid=True), nullable=True)
    entity_name = Column(String(255), nullable=True)   # human-readable reference e.g. "SO-0001"

    old_values = Column(JSONB, nullable=True)
    new_values = Column(JSONB, nullable=True)
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
