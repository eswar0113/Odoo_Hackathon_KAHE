from datetime import date, timedelta
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.product import Product, MovementType, ProcurementType, ProcurementStrategy
from app.models.audit import AuditLog
from app.models.user import User, UserRole
from app.schemas.product import ProductCreate, ProductUpdate, PricingUpdate, ProductOut, StockAdjustment, StockLedgerOut
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
    search: Optional[str] = Query(None, description="Search in name, description, category"),
    category: Optional[str] = Query(None),
    procurement_type: Optional[ProcurementType] = Query(None),
    procurement_strategy: Optional[ProcurementStrategy] = Query(None),
    min_price: Optional[Decimal] = Query(None, description="Minimum sales price"),
    max_price: Optional[Decimal] = Query(None, description="Maximum sales price"),
    low_stock: Optional[bool] = Query(None, description="Only products at or below reorder point"),
    active_only: bool = Query(True),
    sort_by: str = Query("name", pattern="^(name|sales_price|on_hand_qty|created_at)$"),
    sort_order: str = Query("asc", pattern="^(asc|desc)$"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.query(Product)
    if active_only:
        q = q.filter(Product.is_active == True)
    if search:
        term = f"%{search}%"
        q = q.filter(
            or_(
                Product.name.ilike(term),
                Product.description.ilike(term),
                Product.category.ilike(term),
            )
        )
    if category:
        q = q.filter(Product.category.ilike(f"%{category}%"))
    if procurement_type:
        q = q.filter(Product.procurement_type == procurement_type)
    if procurement_strategy:
        q = q.filter(Product.procurement_strategy == procurement_strategy)
    if min_price is not None:
        q = q.filter(Product.sales_price >= min_price)
    if max_price is not None:
        q = q.filter(Product.sales_price <= max_price)
    if low_stock is True:
        q = q.filter(Product.on_hand_qty <= Product.reorder_point)
    sort_col = getattr(Product, sort_by)
    q = q.order_by(sort_col.desc() if sort_order == "desc" else sort_col.asc())
    return q.offset(skip).limit(limit).all()


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


@router.patch("/{product_id}/pricing", response_model=ProductOut)
def update_pricing(
    product_id: UUID,
    payload: PricingUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(_write_roles),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    old_prices = {
        "cost_price": str(product.cost_price),
        "sales_price": str(product.sales_price),
        "tax_percent": str(product.tax_percent),
    }
    product.cost_price = payload.cost_price
    product.sales_price = payload.sales_price
    product.tax_percent = payload.tax_percent
    db.commit()
    db.refresh(product)
    log_action(db, "UPDATE", "product", product.id, product.name,
               old_values=old_prices,
               new_values={
                   "cost_price": str(payload.cost_price),
                   "sales_price": str(payload.sales_price),
                   "tax_percent": str(payload.tax_percent),
               },
               user_id=current_user.id)
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
    new_qty = float(product.on_hand_qty) + float(payload.qty)
    if new_qty < 0:
        raise HTTPException(status_code=400, detail="Adjustment would make stock negative")
    if new_qty < float(product.reserved_qty):
        raise HTTPException(
            status_code=400,
            detail=f"Adjustment would make on-hand ({new_qty:.2f}) fall below reserved qty ({float(product.reserved_qty):.2f})"
        )
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


@router.get("/{product_id}/audit-logs")
def product_audit_logs(
    product_id: UUID,
    action: Optional[str] = Query(None, description="e.g. CREATE, UPDATE, STOCK_ADJUST"),
    user_id: Optional[UUID] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.query(AuditLog).filter(
        AuditLog.entity_type == "product",
        AuditLog.entity_id == product_id,
    )
    if action:
        q = q.filter(AuditLog.action == action.upper())
    if user_id:
        q = q.filter(AuditLog.user_id == user_id)
    if date_from:
        q = q.filter(AuditLog.created_at >= date_from)
    if date_to:
        q = q.filter(AuditLog.created_at < date_to + timedelta(days=1))
    return q.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/{product_id}/stock-ledger", response_model=List[StockLedgerOut])
def stock_ledger(
    product_id: UUID,
    movement_type: Optional[MovementType] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    from app.models.product import StockLedger
    q = db.query(StockLedger).filter(StockLedger.product_id == product_id)
    if movement_type:
        q = q.filter(StockLedger.movement_type == movement_type)
    if date_from:
        q = q.filter(StockLedger.created_at >= date_from)
    if date_to:
        q = q.filter(StockLedger.created_at < date_to + timedelta(days=1))
    return q.order_by(StockLedger.created_at.desc()).offset(skip).limit(limit).all()
