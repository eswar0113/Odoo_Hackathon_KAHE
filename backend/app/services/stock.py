from decimal import Decimal
from typing import Optional
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.product import Product, StockLedger, MovementType


def record_movement(
    db: Session,
    product: Product,
    movement_type: MovementType,
    qty_change: Decimal,
    reference_type: Optional[str] = None,
    reference_id: Optional[UUID] = None,
    notes: Optional[str] = None,
    created_by: Optional[UUID] = None,
) -> StockLedger:
    qty_before = Decimal(str(product.on_hand_qty))
    qty_after = qty_before + qty_change
    product.on_hand_qty = qty_after

    entry = StockLedger(
        product_id=product.id,
        movement_type=movement_type,
        reference_type=reference_type,
        reference_id=reference_id,
        qty_change=qty_change,
        qty_before=qty_before,
        qty_after=qty_after,
        notes=notes,
        created_by=created_by,
    )
    db.add(entry)
    return entry


def reserve_stock(db: Session, product: Product, qty: Decimal) -> None:
    product.reserved_qty = Decimal(str(product.reserved_qty)) + qty


def release_reservation(db: Session, product: Product, qty: Decimal) -> None:
    product.reserved_qty = max(Decimal("0"), Decimal(str(product.reserved_qty)) - qty)
