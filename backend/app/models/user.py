import uuid
from sqlalchemy import Column, String, Boolean, DateTime, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import enum

from app.database import Base


class UserRole(str, enum.Enum):
    admin = "admin"
    sales = "sales"
    purchase = "purchase"
    manufacturing = "manufacturing"
    inventory = "inventory"
    owner = "owner"


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    full_name = Column(String(255), nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(SAEnum(UserRole), nullable=False, default=UserRole.sales)
    is_active = Column(Boolean, default=True, nullable=False)
    phone = Column(String(50), nullable=True)
    bio = Column(String(500), nullable=True)
    department = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
