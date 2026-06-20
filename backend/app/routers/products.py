from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.product import Product, MovementType
from app.models.user import User, UserRole
from app.schemas.product import ProductCreate, ProductUpdate, ProductOut, StockAdjustment, StockLedgerOut
from app.core.deps import get_current_user, require_roles
from app.services.stock import record_movement
from app.services.audit import log_action

router = APIRouter(prefix="/api/products", tags=["Products"])

_write_roles = require_roles(UserRole.owner, UserRole.inventory, UserRole.admin)


@router.post("", response_model=ProductOut, status_code=201)
def create_product(
    payload: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(_write_roles),
):
    product = Product(**payload.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    log_action(db, "CREATE", "product", product.id, product.name, user_id=current_user.id)
    db.commit()
    return product


@router.get("", response_model=List[ProductOut])
def list_products(
    search: Optional[str] = Query(None),
    active_only: bool = True,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.query(Product)
    if active_only:
        q = q.filter(Product.is_active == True)
    if search:
        q = q.filter(Product.name.ilike(f"%{search}%"))
    return q.order_by(Product.name).all()


@router.get("/{product_id}", response_model=ProductOut)
def get_product(product_id: UUID, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.put("/{product_id}", response_model=ProductOut)
def update_product(
    product_id: UUID,
    payload: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(_write_roles),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    old = {"name": product.name, "sales_price": str(product.sales_price)}
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(product, field, value)
    db.commit()
    db.refresh(product)
    log_action(db, "UPDATE", "product", product.id, product.name, old_values=old, user_id=current_user.id)
    db.commit()
    return product


@router.post("/{product_id}/adjust-stock", response_model=ProductOut)
def adjust_stock(
    product_id: UUID,
    payload: StockAdjustment,
    db: Session = Depends(get_db),
    current_user: User = Depends(_write_roles),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    record_movement(
        db, product, MovementType.adjustment, payload.qty,
        notes=payload.notes, created_by=current_user.id
    )
    db.commit()
    db.refresh(product)
    log_action(db, "STOCK_ADJUST", "product", product.id, product.name,
               new_values={"qty": str(payload.qty)}, user_id=current_user.id)
    db.commit()
    return product


@router.get("/{product_id}/stock-ledger", response_model=List[StockLedgerOut])
def stock_ledger(
    product_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    from app.models.product import StockLedger
    return (
        db.query(StockLedger)
        .filter(StockLedger.product_id == product_id)
        .order_by(StockLedger.created_at.desc())
        .all()
    )
