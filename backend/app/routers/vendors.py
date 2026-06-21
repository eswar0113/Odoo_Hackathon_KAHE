from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.vendor import Vendor
from app.models.user import User, UserRole
from app.schemas.vendor import VendorCreate, VendorUpdate, VendorOut
from app.core.deps import get_current_user, require_roles

router = APIRouter(prefix="/api/vendors", tags=["Vendors"])
_write = require_roles(UserRole.purchase, UserRole.owner, UserRole.admin)


@router.post("", response_model=VendorOut, status_code=201)
def create_vendor(payload: VendorCreate, db: Session = Depends(get_db), _: User = Depends(_write)):
    vendor = Vendor(**payload.model_dump())
    db.add(vendor)
    db.commit()
    db.refresh(vendor)
    return vendor


@router.get("", response_model=List[VendorOut])
def list_vendors(
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=200),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.query(Vendor)
    if search:
        term = f"%{search}%"
        q = q.filter(
            or_(
                Vendor.name.ilike(term),
                Vendor.email.ilike(term),
                Vendor.phone.ilike(term),
            )
        )
    return q.order_by(Vendor.name).offset(skip).limit(limit).all()


@router.get("/{vendor_id}", response_model=VendorOut)
def get_vendor(vendor_id: UUID, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    return vendor


@router.put("/{vendor_id}", response_model=VendorOut)
def update_vendor(vendor_id: UUID, payload: VendorUpdate, db: Session = Depends(get_db), _: User = Depends(_write)):
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(vendor, field, value)
    db.commit()
    db.refresh(vendor)
    return vendor
