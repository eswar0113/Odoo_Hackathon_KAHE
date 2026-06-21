from datetime import date
from decimal import Decimal
from typing import Optional

from sqlalchemy.orm import Session

from app.models.product import Product
from app.models.product import ProcurementType
from app.models.purchase import PurchaseOrder, PurchaseOrderLine, PurchaseOrderStatus
from app.models.manufacturing import ManufacturingOrder, MOStatus
from app.services.sequence import next_po_name, next_mo_name
from app.services.audit import log_action


def trigger_procurement(
    db: Session,
    product: Product,
    qty: Decimal,
    origin_ref: Optional[str] = None,
    current_user=None,
) -> None:
    user_id = current_user.id if current_user else None

    if product.procurement_type == ProcurementType.purchase:
        _create_purchase_order(db, product, qty, origin_ref, user_id)
    elif product.procurement_type == ProcurementType.manufacturing:
        _create_manufacturing_order(db, product, qty, origin_ref, user_id)


def _create_purchase_order(db: Session, product: Product, qty: Decimal, origin_ref: Optional[str], user_id) -> PurchaseOrder:
    if not product.vendor_id:
        log_action(db, "AUTO_CREATE", "purchase_order", None, None,
                   new_values={"error": f"No vendor set for product '{product.name}' — PO skipped", "origin": origin_ref},
                   user_id=user_id)
        return None

    po = PurchaseOrder(
        name=next_po_name(db),
        vendor_id=product.vendor_id,
        status=PurchaseOrderStatus.draft,
        order_date=date.today(),
        origin_ref=origin_ref,
        created_by=user_id,
    )
    db.add(po)
    db.flush()

    line = PurchaseOrderLine(
        order_id=po.id,
        product_id=product.id,
        qty_ordered=qty,
        unit_price=product.cost_price,
    )
    db.add(line)
    log_action(db, "AUTO_CREATE", "purchase_order", po.id, po.name,
               new_values={"origin": origin_ref, "qty": str(qty)}, user_id=user_id)
    return po


def _create_manufacturing_order(db: Session, product: Product, qty: Decimal, origin_ref: Optional[str], user_id) -> ManufacturingOrder:
    from app.models.manufacturing import BOM, ManufacturingOrderComponent, WorkOrder

    bom = db.query(BOM).filter(BOM.product_id == product.id, BOM.is_active == "Y").first()

    mo = ManufacturingOrder(
        name=next_mo_name(db),
        product_id=product.id,
        bom_id=bom.id if bom else None,
        qty_planned=qty,
        status=MOStatus.draft,
        scheduled_date=date.today(),
        origin_ref=origin_ref,
        created_by=user_id,
    )
    db.add(mo)
    db.flush()

    if bom:
        for bom_line in bom.lines:
            component = ManufacturingOrderComponent(
                mo_id=mo.id,
                product_id=bom_line.component_id,
                qty_planned=Decimal(str(bom_line.qty)) * qty,
            )
            db.add(component)
        for op in sorted(bom.operations, key=lambda x: x.sequence):
            wo = WorkOrder(
                mo_id=mo.id,
                operation_name=op.operation_name,
                work_center_id=op.work_center_id,
                duration_minutes=op.duration_minutes,
                sequence=op.sequence,
            )
            db.add(wo)

    log_action(db, "AUTO_CREATE", "manufacturing_order", mo.id, mo.name,
               new_values={"origin": origin_ref, "qty": str(qty)}, user_id=user_id)
    return mo


def check_reorder_points(db: Session) -> None:
    """Called by a scheduler or manually to trigger MTS replenishment."""
    products = db.query(Product).filter(
        Product.procure_on_demand == True,
        Product.is_active == True,
    ).all()
    for product in products:
        free_qty = Decimal(str(product.on_hand_qty)) - Decimal(str(product.reserved_qty))
        if free_qty < Decimal(str(product.reorder_point)):
            qty_to_order = Decimal(str(product.reorder_qty)) - free_qty
            if qty_to_order > 0:
                trigger_procurement(db, product, qty_to_order, origin_ref="MTS-AUTO")
    db.commit()
