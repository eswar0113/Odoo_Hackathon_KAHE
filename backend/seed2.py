"""
Seed file 2 — Alternative full dataset for Shiv Furniture Works Mini ERP.
Covers ALL tables including stock_ledger and audit_logs.
Run from the backend directory:
    python seed2.py
"""
import sys
import os
from datetime import date, timedelta, datetime, timezone
from decimal import Decimal

sys.path.insert(0, os.path.dirname(__file__))

from sqlalchemy import text
from app.database import SessionLocal
from app.core.security import hash_password
from app.models.user import User, UserRole
from app.models.vendor import Vendor
from app.models.customer import Customer
from app.models.product import Product, ProcurementType, ProcurementStrategy, StockLedger, MovementType
from app.models.purchase import PurchaseOrder, PurchaseOrderLine, PurchaseOrderStatus
from app.models.sales import SalesOrder, SalesOrderLine, SalesOrderStatus
from app.models.manufacturing import (
    ManufacturingOrder, ManufacturingOrderComponent, WorkOrder,
    BOM, BOMLine, BOMOperation, WorkCenter, MOStatus, WorkOrderStatus
)
from app.models.audit import AuditLog


def clear_db(db):
    print("  Clearing existing data...")
    tables = [
        "work_orders", "manufacturing_order_components", "bom_operations", "bom_lines",
        "manufacturing_orders", "boms", "work_centers",
        "sales_order_lines", "sales_orders",
        "purchase_order_lines", "purchase_orders",
        "stock_ledger", "audit_logs",
        "products", "customers", "vendors", "users",
    ]
    for table in tables:
        db.execute(text(f"TRUNCATE TABLE {table} RESTART IDENTITY CASCADE"))
    db.commit()
    print("  ✓ Database cleared")


def add_stock_movement(db, product, movement_type, qty_change, ref_type=None, ref_id=None, notes=None, user_id=None):
    qty_before = Decimal(str(product.on_hand_qty))
    qty_after = qty_before + Decimal(str(qty_change))
    product.on_hand_qty = qty_after
    entry = StockLedger(
        product_id=product.id,
        movement_type=movement_type,
        reference_type=ref_type,
        reference_id=ref_id,
        qty_change=Decimal(str(qty_change)),
        qty_before=qty_before,
        qty_after=qty_after,
        notes=notes,
        created_by=user_id,
    )
    db.add(entry)
    return entry


def add_audit(db, action, entity_type, entity_id, entity_name, old_values=None, new_values=None, user_id=None, notes=None):
    db.add(AuditLog(
        action=action, entity_type=entity_type,
        entity_id=entity_id, entity_name=entity_name,
        old_values=old_values, new_values=new_values,
        notes=notes, user_id=user_id,
    ))


def run():
    db = SessionLocal()
    try:
        print("Seeding Shiv Furniture Works ERP — Dataset 2...")
        clear_db(db)

        today = date.today()

        # ── Users ────────────────────────────────────────────────────
        user_rows = [
            ("admin@shiv.com",     "Admin User",        "admin123",    UserRole.admin),
            ("owner@shiv.com",     "Ramesh Gupta",      "owner123",    UserRole.owner),
            ("sales@shiv.com",     "Anita Sharma",      "sales123",    UserRole.sales),
            ("sales2@shiv.com",    "Vikram Singh",      "sales123",    UserRole.sales),
            ("sales3@shiv.com",    "Neha Joshi",        "sales123",    UserRole.sales),
            ("purchase@shiv.com",  "Arun Patel",        "purchase123", UserRole.purchase),
            ("inventory@shiv.com", "Pooja Menon",       "inv123",      UserRole.inventory),
            ("mfg@shiv.com",       "Ravi Shankar",      "mfg123",      UserRole.manufacturing),
            ("mfg2@shiv.com",      "Dinesh Yadav",      "mfg123",      UserRole.manufacturing),
        ]
        for email, name, pwd, role in user_rows:
            if not db.query(User).filter(User.email == email).first():
                db.add(User(email=email, full_name=name, password_hash=hash_password(pwd), role=role))
        db.commit()

        def u(email): return db.query(User).filter(User.email == email).first()
        admin    = u("admin@shiv.com")
        owner    = u("owner@shiv.com")
        sales1   = u("sales@shiv.com")
        sales2   = u("sales2@shiv.com")
        sales3   = u("sales3@shiv.com")
        purchase = u("purchase@shiv.com")
        inv_usr  = u("inventory@shiv.com")
        mfg1     = u("mfg@shiv.com")
        mfg2     = u("mfg2@shiv.com")
        print(f"  + {len(user_rows)} users")

        # ── Vendors ──────────────────────────────────────────────────
        vendor_rows = [
            ("KeralaWood Timber House",  "orders@keralawood.com",    "+91-9711001001", "Perinthalmanna, Kerala 679322"),
            ("BambooAge Industries",     "supply@bambooage.com",     "+91-9711002002", "Silvassa, Dadra & NH 396230"),
            ("IndoSteel Works",          "sales@indosteel.com",      "+91-9711003003", "Bhilai, Chhattisgarh 490001"),
            ("SoftComfort Foam",         "info@softcomfort.com",     "+91-9711004004", "Surat, Gujarat 395003"),
            ("CrystalClear Glass",       "bulk@crystalclear.com",    "+91-9711005005", "Firozabad, UP 283203"),
            ("EcoWood Furnishings",      "eco@ecowood.in",           "+91-9711006006", "Rajkot, Gujarat 360001"),
            ("HardRight Fasteners",      "orders@hardright.com",     "+91-9711007007", "Coimbatore, TN 641001"),
            ("ColourCraft Paints",       "paint@colourcraft.com",    "+91-9711008008", "Ankleshwar, Gujarat 393001"),
        ]
        for name, email, phone, address in vendor_rows:
            if not db.query(Vendor).filter(Vendor.name == name).first():
                db.add(Vendor(name=name, email=email, phone=phone, address=address))
        db.commit()

        def v(name): return db.query(Vendor).filter(Vendor.name == name).first()
        v_wood      = v("KeralaWood Timber House")
        v_bamboo    = v("BambooAge Industries")
        v_steel     = v("IndoSteel Works")
        v_foam      = v("SoftComfort Foam")
        v_glass     = v("CrystalClear Glass")
        v_eco       = v("EcoWood Furnishings")
        v_fast      = v("HardRight Fasteners")
        v_paint     = v("ColourCraft Paints")
        print(f"  + {len(vendor_rows)} vendors")

        # ── Customers ────────────────────────────────────────────────
        customer_rows = [
            ("Oakwood Interior Studio",   "studio@oakwoodinteriors.com",  "+91-9801001001", "Koramangala, Bangalore 560034"),
            ("FurniWorld Retail Chain",   "purchase@furniworld.com",      "+91-9801002002", "Sector 18, Noida, UP 201301"),
            ("Sunrise Home Furnishings",  "sunrise@homefurnish.in",       "+91-9801003003", "Banjara Hills, Hyderabad 500034"),
            ("Heritage Decor & Arts",     "heritage@decorarts.com",       "+91-9801004004", "C.G. Road, Ahmedabad 380006"),
            ("Sapphire Living Pvt Ltd",   "orders@sapphireliving.com",    "+91-9801005005", "Whitefield, Bangalore 560066"),
            ("Crown Furniture Palace",    "crown@furnpalace.com",         "+91-9801006006", "Karol Bagh, New Delhi 110005"),
            ("NestWell Home Store",       "nestwell@homestore.in",        "+91-9801007007", "T. Nagar, Chennai 600017"),
            ("Elegant Spaces Pvt Ltd",    "elegant@elegantspaces.com",    "+91-9801008008", "Viman Nagar, Pune 411014"),
            ("Bliss Furniture Gallery",   "bliss@furnituregallery.in",    "+91-9801009009", "Park Street, Kolkata 700016"),
            ("ZenHome Interiors",         "zen@zenhomeinteriors.com",     "+91-9801010010", "Hazratganj, Lucknow 226001"),
            ("StyleCraft Furniture",      "style@stylecraft.in",          "+91-9801011011", "Pal Road, Jodhpur 342001"),
            ("PrimeLiving Solutions",     "prime@primeliving.com",        "+91-9801012012", "Vijaya Nagar, Mysore 570017"),
        ]
        for name, email, phone, address in customer_rows:
            if not db.query(Customer).filter(Customer.name == name).first():
                db.add(Customer(name=name, email=email, phone=phone, address=address))
        db.commit()

        def c(name): return db.query(Customer).filter(Customer.name == name).first()
        custs = [c(r[0]) for r in customer_rows]
        print(f"  + {len(customer_rows)} customers")

        # ── Work Centers ─────────────────────────────────────────────
        wc_rows = [
            ("Sawmill Station",      "Heavy wood cutting and dimensioning"),
            ("Joinery Workshop",     "Joints, dado cuts, mortise and tenon"),
            ("CNC Routing Bay",      "CNC router for precision cuts and carvings"),
            ("Assembly Hall",        "Primary furniture assembly hall"),
            ("Upholstery Room",      "Foam, fabric and leather fitting"),
            ("Spray Paint Booth",    "Spray painting and lacquer booth"),
            ("Polish & Wax Bay",     "Manual polishing and wax finishing"),
            ("QA Inspection Dock",   "Final quality assurance and dispatch check"),
        ]
        for name, desc in wc_rows:
            if not db.query(WorkCenter).filter(WorkCenter.name == name).first():
                db.add(WorkCenter(name=name, description=desc))
        db.commit()

        def wc(name): return db.query(WorkCenter).filter(WorkCenter.name == name).first()
        wc_saw    = wc("Sawmill Station")
        wc_join   = wc("Joinery Workshop")
        wc_cnc    = wc("CNC Routing Bay")
        wc_asm    = wc("Assembly Hall")
        wc_uphol  = wc("Upholstery Room")
        wc_spray  = wc("Spray Paint Booth")
        wc_polish = wc("Polish & Wax Bay")
        wc_qa     = wc("QA Inspection Dock")
        print(f"  + {len(wc_rows)} work centers")

        # ── Raw Materials ────────────────────────────────────────────
        def upsert(name, **kw):
            p = db.query(Product).filter(Product.name == name).first()
            if not p:
                p = Product(name=name, **kw)
                db.add(p)
                db.flush()
            return p

        raw = {}
        raw_defs = [
            # name                              cat           uom    sp    cp    oh   rp   rq   vendor
            ("Rosewood Plank 6ft",           "Raw Material","pcs", 1100,  820, 150, 40,  80, v_wood),
            ("Rosewood Plank 4ft",           "Raw Material","pcs",  720,  530, 120, 30,  60, v_wood),
            ("Bamboo Panel 8x4ft",           "Raw Material","pcs",  380,  270, 200, 50, 100, v_bamboo),
            ("Bamboo Strip (bundle)",        "Raw Material","bundle",290, 210, 100, 30,  60, v_bamboo),
            ("Plywood 19mm BWR Grade",       "Raw Material","sheet",520,  380, 180, 45,  90, v_wood),
            ("Plywood 12mm BWR Grade",       "Raw Material","sheet",380,  270, 150, 40,  80, v_wood),
            ("HDF Board 6mm",                "Raw Material","sheet",180,  130, 120, 30,  60, v_wood),
            ("Mild Steel Pipe 1inch",        "Raw Material","mtr",  95,   68,  300, 80, 150, v_steel),
            ("Mild Steel Sheet 2mm",         "Raw Material","sqft",  72,   52,  400, 80, 160, v_steel),
            ("Stainless Steel Rod 12mm",     "Raw Material","mtr",  145,  105, 200, 50, 100, v_steel),
            ("HR Foam 5inch",                "Raw Material","sqft",  88,   64,  350, 80, 150, v_foam),
            ("HR Foam 3inch",                "Raw Material","sqft",  55,   40,  300, 70, 120, v_foam),
            ("Leatherette Fabric",           "Raw Material","meter", 380,  270, 100, 25,  50, v_foam),
            ("Cotton Fabric Beige",          "Raw Material","meter", 210,  150, 150, 40,  80, v_foam),
            ("Microfiber Fabric Grey",       "Raw Material","meter", 260,  185, 120, 35,  70, v_foam),
            ("Tempered Glass 8mm",           "Raw Material","sqft",  240,  175,  60, 15,  30, v_glass),
            ("Float Glass 5mm",             "Raw Material","sqft",  150,  110,  80, 20,  40, v_glass),
            ("M6 Nut Bolt Set (100pcs)",    "Raw Material","box",    90,   65,  200, 50, 100, v_fast),
            ("Dowel Pin Set (50pcs)",        "Raw Material","box",    55,   38,  250, 60, 120, v_fast),
            ("Concealed Hinge (pair)",       "Raw Material","pair",   75,   54,  180, 45,  90, v_fast),
            ("Telescopic Drawer Slide",      "Raw Material","pair",  210,  150, 120, 30,  60, v_fast),
            ("Caster Wheel Set (4pcs)",      "Raw Material","set",   180,  130, 100, 25,  50, v_fast),
            ("PU Spray Paint - Walnut",      "Raw Material","ltr",   380,  270,  50, 15,  30, v_paint),
            ("PU Spray Paint - Mahogany",    "Raw Material","ltr",   360,  255,  50, 15,  30, v_paint),
            ("NC Lacquer Clear Coat",        "Raw Material","ltr",   290,  210,  60, 15,  30, v_paint),
            ("Wood Filler Paste",            "Raw Material","kg",    120,   88,  80, 20,  40, v_paint),
            ("Abrasive Paper 80 Grit",       "Raw Material","roll",   85,   60,  100, 25,  50, v_paint),
            ("Rubber Bumper Pad (set 4)",    "Raw Material","set",    42,   30,  400, 80, 150, v_fast),
        ]
        for name, cat, uom, sp, cp, oh, rp, rq, vendor in raw_defs:
            raw[name] = upsert(
                name, category=cat, unit_of_measure=uom,
                sales_price=Decimal(str(sp)), cost_price=Decimal(str(cp)),
                on_hand_qty=Decimal(str(oh)), reserved_qty=Decimal("0"),
                procure_on_demand=True, procurement_type=ProcurementType.purchase,
                procurement_strategy=ProcurementStrategy.mts,
                reorder_point=Decimal(str(rp)), reorder_qty=Decimal(str(rq)),
                vendor_id=vendor.id,
            )
        db.commit()
        print(f"  + {len(raw_defs)} raw material products")

        # ── Finished Goods ───────────────────────────────────────────
        fg = {}
        fg_defs = [
            # name                              cat                 uom    sp      cp    oh  strat   ptype           vendor
            ("Rosewood Executive Desk",       "Office Furniture",  "pcs", 32000, 21000, 12, "mto","manufacturing", None),
            ("Bamboo Dining Table 6-Seat",    "Dining Furniture",  "pcs", 28000, 18000,  8, "mto","manufacturing", None),
            ("Rosewood Dining Table 4-Seat",  "Dining Furniture",  "pcs", 22000, 14500, 14, "mts","manufacturing", None),
            ("Leatherette Sofa Set 3+2",      "Living Room",       "set", 65000, 42000,  5, "mto","manufacturing", None),
            ("Bamboo Bookshelf 6-Tier",       "Storage",           "pcs", 14000,  9000, 18, "mts","manufacturing", None),
            ("Steel-Frame Office Desk",       "Office Furniture",  "pcs", 18500, 12000, 15, "mts","manufacturing", None),
            ("Wardrobe 4-Door Hinged",        "Bedroom Furniture", "pcs", 42000, 27000,  4, "mto","manufacturing", None),
            ("Platform Bed (King Size)",      "Bedroom Furniture", "pcs", 38000, 24500,  6, "mts","manufacturing", None),
            ("Floating Wall Shelf Set",       "Storage",           "set",  8500,  5500, 30, "mts","manufacturing", None),
            ("Computer Workstation Desk",     "Office Furniture",  "pcs", 24000, 15500, 10, "mts","manufacturing", None),
            ("Coffee Table (Glass Top)",      "Living Room",       "pcs", 12500,  8000, 20, "mts","manufacturing", None),
            ("Shoe Cabinet 4-Tier",           "Storage",           "pcs",  6500,  4200, 25, "mts","manufacturing", None),
            ("Dressing Table with Mirror",    "Bedroom Furniture", "pcs", 16000, 10500, 12, "mts","manufacturing", None),
            ("Kids Study Table & Chair Set",  "Study Furniture",   "set", 11000,  7200, 15, "mts","manufacturing", None),
            ("Recliner Chair (Leatherette)",  "Living Room",       "pcs", 22000, 14500,  8, "mts","purchase",       v_eco),
            ("Bar Stool Set (2pcs)",          "Misc",              "set",  7500,  4900, 20, "mts","purchase",       v_eco),
        ]
        for name, cat, uom, sp, cp, oh, strat, ptype, vendor in fg_defs:
            fg[name] = upsert(
                name, category=cat, unit_of_measure=uom,
                sales_price=Decimal(str(sp)), cost_price=Decimal(str(cp)),
                on_hand_qty=Decimal(str(oh)), reserved_qty=Decimal("0"),
                procure_on_demand=(strat == "mts"),
                procurement_type=ProcurementType.purchase if ptype == "purchase" else ProcurementType.manufacturing,
                procurement_strategy=ProcurementStrategy.mts if strat == "mts" else ProcurementStrategy.mto,
                reorder_point=Decimal("3"), reorder_qty=Decimal("10"),
                vendor_id=vendor.id if vendor else None,
            )
        db.commit()
        print(f"  + {len(fg_defs)} finished goods")

        # ── Stock Ledger — Historical Movements ──────────────────────
        ledger_entries = [
            # (product, type, qty, notes)
            (raw["Rosewood Plank 6ft"],     MovementType.purchase_receipt, 150, "Initial receipt from KeralaWood"),
            (raw["Rosewood Plank 4ft"],     MovementType.purchase_receipt, 120, "Initial receipt from KeralaWood"),
            (raw["Bamboo Panel 8x4ft"],     MovementType.purchase_receipt, 200, "Bulk stock from BambooAge"),
            (raw["Plywood 19mm BWR Grade"], MovementType.purchase_receipt, 180, "First batch from KeralaWood"),
            (raw["HR Foam 5inch"],          MovementType.purchase_receipt, 350, "SoftComfort delivery"),
            (raw["Leatherette Fabric"],     MovementType.purchase_receipt, 100, "SoftComfort delivery"),
            (fg["Bamboo Bookshelf 6-Tier"], MovementType.manufacturing_produce, 18, "MO-0001 production complete"),
            (fg["Steel-Frame Office Desk"], MovementType.manufacturing_produce, 15, "MO-0002 production complete"),
            (fg["Floating Wall Shelf Set"], MovementType.manufacturing_produce, 30, "MO-0003 production complete"),
            (fg["Coffee Table (Glass Top)"],MovementType.manufacturing_produce, 20, "MO-0004 production complete"),
            (fg["Bamboo Bookshelf 6-Tier"], MovementType.sale_delivery, -5, "Delivery to Oakwood Interior Studio"),
            (fg["Steel-Frame Office Desk"], MovementType.sale_delivery, -3, "Delivery to FurniWorld Retail Chain"),
            (fg["Coffee Table (Glass Top)"],MovementType.sale_delivery, -4, "Delivery to Sunrise Home Furnishings"),
            (raw["Rosewood Plank 6ft"],     MovementType.adjustment, -5, "Damage write-off after inspection"),
            (raw["HR Foam 5inch"],          MovementType.adjustment, 10, "Stock count correction"),
        ]
        for prod, mtype, qty, notes in ledger_entries:
            add_stock_movement(db, prod, mtype, qty, notes=notes, user_id=inv_usr.id)
        db.commit()
        print(f"  + {len(ledger_entries)} stock ledger entries")

        # ── Bills of Materials ───────────────────────────────────────
        bom_defs = [
            {
                "product": "Rosewood Executive Desk", "name": "Rosewood Executive Desk BoM", "version": "2.0",
                "components": [
                    ("Rosewood Plank 6ft", 5), ("Rosewood Plank 4ft", 3),
                    ("Plywood 19mm BWR Grade", 2), ("M6 Nut Bolt Set (100pcs)", 1),
                    ("Dowel Pin Set (50pcs)", 2), ("PU Spray Paint - Walnut", 1),
                    ("NC Lacquer Clear Coat", 1), ("Rubber Bumper Pad (set 4)", 1),
                    ("Abrasive Paper 80 Grit", 2), ("Wood Filler Paste", 1),
                ],
                "ops": [
                    ("Log Dimensioning",     wc_saw,    90, 10),
                    ("Joinery & Routing",    wc_join,  120, 20),
                    ("CNC Detailing",        wc_cnc,    60, 30),
                    ("Assembly",             wc_asm,   150, 40),
                    ("Spray Painting",       wc_spray,  90, 50),
                    ("Polish & Wax",         wc_polish, 60, 60),
                    ("QA Inspection",        wc_qa,     30, 70),
                ],
            },
            {
                "product": "Bamboo Dining Table 6-Seat", "name": "Bamboo 6-Seat Dining Table BoM", "version": "1.0",
                "components": [
                    ("Bamboo Panel 8x4ft", 4), ("Bamboo Strip (bundle)", 3),
                    ("Mild Steel Pipe 1inch", 6), ("M6 Nut Bolt Set (100pcs)", 1),
                    ("PU Spray Paint - Walnut", 1), ("NC Lacquer Clear Coat", 1),
                    ("Rubber Bumper Pad (set 4)", 1), ("Abrasive Paper 80 Grit", 1),
                ],
                "ops": [
                    ("Bamboo Cutting",   wc_saw,    60, 10),
                    ("Steel Welding",    wc_asm,    90, 20),
                    ("Assembly",         wc_asm,   120, 30),
                    ("Spray Painting",   wc_spray,  60, 40),
                    ("QA Inspection",    wc_qa,     20, 50),
                ],
            },
            {
                "product": "Rosewood Dining Table 4-Seat", "name": "Rosewood 4-Seat Dining Table BoM", "version": "1.0",
                "components": [
                    ("Rosewood Plank 6ft", 3), ("Rosewood Plank 4ft", 2),
                    ("M6 Nut Bolt Set (100pcs)", 1), ("Dowel Pin Set (50pcs)", 1),
                    ("PU Spray Paint - Mahogany", 1), ("NC Lacquer Clear Coat", 1),
                    ("Rubber Bumper Pad (set 4)", 1), ("Abrasive Paper 80 Grit", 1),
                ],
                "ops": [
                    ("Log Dimensioning", wc_saw,    75, 10),
                    ("Joinery",          wc_join,   90, 20),
                    ("Assembly",         wc_asm,   100, 30),
                    ("Spray Painting",   wc_spray,  60, 40),
                    ("QA Inspection",    wc_qa,     20, 50),
                ],
            },
            {
                "product": "Leatherette Sofa Set 3+2", "name": "Leatherette Sofa Set 3+2 BoM", "version": "1.0",
                "components": [
                    ("Rosewood Plank 4ft", 10), ("Plywood 12mm BWR Grade", 6),
                    ("HR Foam 5inch", 80), ("HR Foam 3inch", 40),
                    ("Leatherette Fabric", 30), ("M6 Nut Bolt Set (100pcs)", 2),
                    ("Caster Wheel Set (4pcs)", 1), ("Rubber Bumper Pad (set 4)", 2),
                    ("Abrasive Paper 80 Grit", 1),
                ],
                "ops": [
                    ("Frame Construction",  wc_saw,    180, 10),
                    ("Frame Assembly",      wc_asm,    120, 20),
                    ("Foam Cutting",        wc_uphol,  150, 30),
                    ("Leatherette Fitting", wc_uphol,  240, 40),
                    ("Finishing",           wc_polish,  60, 50),
                    ("QA Inspection",       wc_qa,      30, 60),
                ],
            },
            {
                "product": "Bamboo Bookshelf 6-Tier", "name": "Bamboo Bookshelf 6-Tier BoM", "version": "1.0",
                "components": [
                    ("Bamboo Panel 8x4ft", 3), ("Bamboo Strip (bundle)", 2),
                    ("M6 Nut Bolt Set (100pcs)", 1), ("Dowel Pin Set (50pcs)", 1),
                    ("NC Lacquer Clear Coat", 1), ("Rubber Bumper Pad (set 4)", 1),
                ],
                "ops": [
                    ("Bamboo Cutting",   wc_saw,    45, 10),
                    ("Assembly",         wc_asm,    90, 20),
                    ("Lacquer Finish",   wc_polish, 30, 30),
                    ("QA Inspection",    wc_qa,     15, 40),
                ],
            },
            {
                "product": "Steel-Frame Office Desk", "name": "Steel-Frame Office Desk BoM", "version": "1.0",
                "components": [
                    ("Mild Steel Pipe 1inch", 8), ("Mild Steel Sheet 2mm", 4),
                    ("Plywood 19mm BWR Grade", 2), ("HDF Board 6mm", 1),
                    ("M6 Nut Bolt Set (100pcs)", 2), ("PU Spray Paint - Walnut", 1),
                    ("Rubber Bumper Pad (set 4)", 1),
                ],
                "ops": [
                    ("Steel Cutting",    wc_saw,    60, 10),
                    ("Welding",          wc_asm,    90, 20),
                    ("Board Fitting",    wc_asm,    60, 30),
                    ("Spray Painting",   wc_spray,  45, 40),
                    ("QA Inspection",    wc_qa,     20, 50),
                ],
            },
            {
                "product": "Wardrobe 4-Door Hinged", "name": "4-Door Hinged Wardrobe BoM", "version": "1.0",
                "components": [
                    ("Plywood 19mm BWR Grade", 8), ("Plywood 12mm BWR Grade", 4),
                    ("Float Glass 5mm", 12), ("Concealed Hinge (pair)", 8),
                    ("Telescopic Drawer Slide", 4), ("M6 Nut Bolt Set (100pcs)", 2),
                    ("Dowel Pin Set (50pcs)", 3), ("PU Spray Paint - Mahogany", 2),
                    ("NC Lacquer Clear Coat", 1),
                ],
                "ops": [
                    ("Panel Cutting",    wc_saw,    120, 10),
                    ("CNC Routing",      wc_cnc,     90, 20),
                    ("Assembly",         wc_asm,    180, 30),
                    ("Glass & Hinge Fitting", wc_asm, 90, 40),
                    ("Spray Painting",   wc_spray,   60, 50),
                    ("QA Inspection",    wc_qa,      30, 60),
                ],
            },
            {
                "product": "Platform Bed (King Size)", "name": "King Size Platform Bed BoM", "version": "1.0",
                "components": [
                    ("Rosewood Plank 6ft", 5), ("Rosewood Plank 4ft", 4),
                    ("Plywood 19mm BWR Grade", 3), ("M6 Nut Bolt Set (100pcs)", 2),
                    ("Dowel Pin Set (50pcs)", 2), ("PU Spray Paint - Mahogany", 2),
                    ("NC Lacquer Clear Coat", 1), ("Rubber Bumper Pad (set 4)", 2),
                ],
                "ops": [
                    ("Log Dimensioning", wc_saw,    120, 10),
                    ("Headboard Joinery",wc_join,    90, 20),
                    ("Assembly",         wc_asm,    150, 30),
                    ("Spray Painting",   wc_spray,   90, 40),
                    ("Polish & Wax",     wc_polish,  45, 50),
                    ("QA Inspection",    wc_qa,      20, 60),
                ],
            },
            {
                "product": "Coffee Table (Glass Top)", "name": "Glass-Top Coffee Table BoM", "version": "1.0",
                "components": [
                    ("Stainless Steel Rod 12mm", 4), ("Tempered Glass 8mm", 6),
                    ("Mild Steel Sheet 2mm", 2), ("M6 Nut Bolt Set (100pcs)", 1),
                    ("Rubber Bumper Pad (set 4)", 1),
                ],
                "ops": [
                    ("Steel Frame Cutting", wc_saw,   45, 10),
                    ("Welding & Shaping",   wc_asm,   60, 20),
                    ("Glass Fitting",       wc_asm,   30, 30),
                    ("QA Inspection",       wc_qa,    15, 40),
                ],
            },
            {
                "product": "Computer Workstation Desk", "name": "Computer Workstation Desk BoM", "version": "1.0",
                "components": [
                    ("Plywood 19mm BWR Grade", 3), ("HDF Board 6mm", 2),
                    ("Mild Steel Pipe 1inch", 4), ("Telescopic Drawer Slide", 2),
                    ("M6 Nut Bolt Set (100pcs)", 1), ("Dowel Pin Set (50pcs)", 1),
                    ("PU Spray Paint - Walnut", 1), ("Rubber Bumper Pad (set 4)", 1),
                ],
                "ops": [
                    ("Panel Cutting",    wc_saw,    60, 10),
                    ("CNC Routing",      wc_cnc,    45, 20),
                    ("Assembly",         wc_asm,    90, 30),
                    ("Spray Painting",   wc_spray,  45, 40),
                    ("QA Inspection",    wc_qa,     20, 50),
                ],
            },
            {
                "product": "Dressing Table with Mirror", "name": "Dressing Table BoM", "version": "1.0",
                "components": [
                    ("Rosewood Plank 4ft", 4), ("Plywood 12mm BWR Grade", 2),
                    ("Float Glass 5mm", 6), ("Concealed Hinge (pair)", 2),
                    ("Telescopic Drawer Slide", 2), ("M6 Nut Bolt Set (100pcs)", 1),
                    ("PU Spray Paint - Mahogany", 1), ("NC Lacquer Clear Coat", 1),
                ],
                "ops": [
                    ("Wood Cutting",     wc_saw,    60, 10),
                    ("Joinery",          wc_join,   75, 20),
                    ("Assembly",         wc_asm,    90, 30),
                    ("Mirror Fitting",   wc_asm,    30, 40),
                    ("Spray Painting",   wc_spray,  45, 50),
                    ("QA Inspection",    wc_qa,     20, 60),
                ],
            },
        ]

        boms = {}
        for bdef in bom_defs:
            pname = bdef["product"]
            prod = fg.get(pname)
            if not prod:
                continue
            existing = db.query(BOM).filter(BOM.product_id == prod.id).first()
            if existing:
                boms[pname] = existing
                continue
            bom = BOM(product_id=prod.id, name=bdef["name"], version=bdef["version"], is_active="Y")
            db.add(bom)
            db.flush()
            for item in bdef["components"]:
                comp_name, qty = item[0], item[1]
                comp = raw.get(comp_name)
                if comp:
                    db.add(BOMLine(bom_id=bom.id, component_id=comp.id, qty=Decimal(str(qty))))
            for op in bdef["ops"]:
                op_name, wc_obj, dur, seq = op[0], op[1], op[2], op[3]
                db.add(BOMOperation(bom_id=bom.id, operation_name=op_name,
                                    work_center_id=wc_obj.id, duration_minutes=dur, sequence=seq))
            boms[pname] = bom
        db.commit()
        print(f"  + {len(boms)} bills of materials")

        # ── Purchase Orders ──────────────────────────────────────────
        po_defs = [
            {
                "vendor": v_wood, "status": PurchaseOrderStatus.fully_received,
                "order_date": today - timedelta(days=60), "expected_date": today - timedelta(days=45),
                "lines": [("Rosewood Plank 6ft",150,820),("Rosewood Plank 4ft",120,530),("Plywood 19mm BWR Grade",80,380)],
            },
            {
                "vendor": v_bamboo, "status": PurchaseOrderStatus.fully_received,
                "order_date": today - timedelta(days=50), "expected_date": today - timedelta(days=35),
                "lines": [("Bamboo Panel 8x4ft",100,270),("Bamboo Strip (bundle)",60,210)],
            },
            {
                "vendor": v_foam, "status": PurchaseOrderStatus.fully_received,
                "order_date": today - timedelta(days=45), "expected_date": today - timedelta(days=30),
                "lines": [("HR Foam 5inch",200,64),("HR Foam 3inch",150,40),("Leatherette Fabric",80,270),("Cotton Fabric Beige",80,150)],
            },
            {
                "vendor": v_steel, "status": PurchaseOrderStatus.partially_received,
                "order_date": today - timedelta(days=20), "expected_date": today + timedelta(days=5),
                "lines": [("Mild Steel Pipe 1inch",200,68),("Mild Steel Sheet 2mm",150,52),("Stainless Steel Rod 12mm",100,105)],
            },
            {
                "vendor": v_glass, "status": PurchaseOrderStatus.confirmed,
                "order_date": today - timedelta(days=12), "expected_date": today + timedelta(days=8),
                "lines": [("Tempered Glass 8mm",50,175),("Float Glass 5mm",60,110)],
            },
            {
                "vendor": v_fast, "status": PurchaseOrderStatus.confirmed,
                "order_date": today - timedelta(days=10), "expected_date": today + timedelta(days=10),
                "lines": [("M6 Nut Bolt Set (100pcs)",80,65),("Dowel Pin Set (50pcs)",100,38),
                          ("Concealed Hinge (pair)",80,54),("Telescopic Drawer Slide",60,150),
                          ("Caster Wheel Set (4pcs)",40,130),("Rubber Bumper Pad (set 4)",150,30)],
            },
            {
                "vendor": v_paint, "status": PurchaseOrderStatus.draft,
                "order_date": today - timedelta(days=4), "expected_date": today + timedelta(days=14),
                "lines": [("PU Spray Paint - Walnut",25,270),("PU Spray Paint - Mahogany",25,255),
                          ("NC Lacquer Clear Coat",30,210),("Wood Filler Paste",20,88),("Abrasive Paper 80 Grit",40,60)],
            },
            {
                "vendor": v_eco, "status": PurchaseOrderStatus.draft,
                "order_date": today - timedelta(days=2), "expected_date": today + timedelta(days=18),
                "lines": [("Recliner Chair (Leatherette)",8,14500),("Bar Stool Set (2pcs)",12,4900)],
            },
        ]

        po_count = 0
        for pod in po_defs:
            po_count += 1
            po = PurchaseOrder(
                name=f"PO-{po_count:04d}",
                vendor_id=pod["vendor"].id,
                status=pod["status"],
                order_date=pod["order_date"],
                expected_date=pod["expected_date"],
                created_by=purchase.id,
            )
            db.add(po)
            db.flush()
            for pname, qty, price in pod["lines"]:
                prod = raw.get(pname) or fg.get(pname)
                if not prod:
                    continue
                qty_received = qty if pod["status"] == PurchaseOrderStatus.fully_received else \
                               (qty // 2 if pod["status"] == PurchaseOrderStatus.partially_received else 0)
                db.add(PurchaseOrderLine(
                    order_id=po.id, product_id=prod.id,
                    qty_ordered=Decimal(str(qty)), qty_received=Decimal(str(qty_received)),
                    unit_price=Decimal(str(price)),
                ))
            add_audit(db, "CREATE", "purchase_order", po.id, po.name,
                      new_values={"vendor": pod["vendor"].name, "status": pod["status"].value},
                      user_id=purchase.id)
        db.commit()
        print(f"  + {len(po_defs)} purchase orders")

        # ── Manufacturing Orders ─────────────────────────────────────
        mo_defs = [
            ("Bamboo Bookshelf 6-Tier",     5, MOStatus.done,        today-timedelta(30), None,     mfg1),
            ("Steel-Frame Office Desk",     4, MOStatus.done,        today-timedelta(25), None,     mfg1),
            ("Floating Wall Shelf Set",     8, MOStatus.done,        today-timedelta(20), None,     mfg2),
            ("Coffee Table (Glass Top)",    6, MOStatus.done,        today-timedelta(15), None,     mfg2),
            ("Rosewood Dining Table 4-Seat",3, MOStatus.in_progress, today-timedelta(5),  None,     mfg1),
            ("Computer Workstation Desk",   4, MOStatus.in_progress, today-timedelta(3),  None,     mfg2),
            ("Platform Bed (King Size)",    3, MOStatus.confirmed,   today+timedelta(5),  None,     mfg1),
            ("Dressing Table with Mirror",  4, MOStatus.confirmed,   today+timedelta(7),  None,     mfg2),
            ("Rosewood Executive Desk",     2, MOStatus.draft,       today+timedelta(12), "SO-0003",None),
            ("Leatherette Sofa Set 3+2",    2, MOStatus.draft,       today+timedelta(15), "SO-0005",None),
            ("Bamboo Dining Table 6-Seat",  2, MOStatus.draft,       today+timedelta(18), None,     None),
            ("Wardrobe 4-Door Hinged",      1, MOStatus.draft,       today+timedelta(20), "SO-0006",None),
        ]

        mo_count = 0
        for pname, qty, status, sched, origin, assignee in mo_defs:
            mo_count += 1
            prod = fg.get(pname)
            if not prod:
                continue
            bom = boms.get(pname)
            mo = ManufacturingOrder(
                name=f"MO-{mo_count:04d}",
                product_id=prod.id,
                bom_id=bom.id if bom else None,
                qty_planned=Decimal(str(qty)),
                qty_produced=Decimal(str(qty)) if status == MOStatus.done else Decimal("0"),
                status=status,
                scheduled_date=sched,
                origin_ref=origin,
                assignee_id=assignee.id if assignee else None,
                created_by=admin.id,
            )
            db.add(mo)
            db.flush()
            if bom:
                for bl in bom.lines:
                    db.add(ManufacturingOrderComponent(
                        mo_id=mo.id, product_id=bl.component_id,
                        qty_planned=Decimal(str(bl.qty)) * Decimal(str(qty)),
                        qty_consumed=Decimal(str(bl.qty)) * Decimal(str(qty)) if status == MOStatus.done else Decimal("0"),
                    ))
                for op in sorted(bom.operations, key=lambda x: x.sequence):
                    wo_status = (WorkOrderStatus.done        if status == MOStatus.done else
                                 WorkOrderStatus.in_progress if status == MOStatus.in_progress else
                                 WorkOrderStatus.pending)
                    db.add(WorkOrder(
                        mo_id=mo.id, operation_name=op.operation_name,
                        work_center_id=op.work_center_id,
                        duration_minutes=op.duration_minutes,
                        sequence=op.sequence, status=wo_status,
                        assignee_id=assignee.id if assignee else None,
                    ))
            add_audit(db, "CREATE", "manufacturing_order", mo.id, mo.name,
                      new_values={"product": pname, "qty": qty, "status": status.value},
                      user_id=admin.id)
        db.commit()
        print(f"  + {len(mo_defs)} manufacturing orders")

        # ── Sales Orders ─────────────────────────────────────────────
        so_defs = [
            {
                "customer": custs[0], "status": SalesOrderStatus.fully_delivered,
                "order_date": today-timedelta(35), "delivery": today-timedelta(25),
                "notes": "Showroom refurbishment order",
                "lines": [("Bamboo Bookshelf 6-Tier",3,14000),("Coffee Table (Glass Top)",2,12500),("Floating Wall Shelf Set",4,8500)],
                "creator": sales1,
            },
            {
                "customer": custs[1], "status": SalesOrderStatus.fully_delivered,
                "order_date": today-timedelta(30), "delivery": today-timedelta(20),
                "notes": "Chain store replenishment",
                "lines": [("Steel-Frame Office Desk",5,18500),("Computer Workstation Desk",3,24000),("Bar Stool Set (2pcs)",10,7500)],
                "creator": sales2,
            },
            {
                "customer": custs[2], "status": SalesOrderStatus.partially_delivered,
                "order_date": today-timedelta(18), "delivery": today+timedelta(7),
                "notes": "Deliver sofas first, desks follow next week",
                "lines": [("Rosewood Executive Desk",2,32000),("Leatherette Sofa Set 3+2",1,65000),("Recliner Chair (Leatherette)",2,22000)],
                "creator": sales1,
            },
            {
                "customer": custs[3], "status": SalesOrderStatus.confirmed,
                "order_date": today-timedelta(12), "delivery": today+timedelta(15),
                "notes": "Bulk order for new showroom launch",
                "lines": [("Rosewood Executive Desk",3,32000),("Bamboo Dining Table 6-Seat",2,28000),
                          ("Rosewood Dining Table 4-Seat",2,22000),("Coffee Table (Glass Top)",4,12500)],
                "creator": sales3,
            },
            {
                "customer": custs[4], "status": SalesOrderStatus.confirmed,
                "order_date": today-timedelta(9), "delivery": today+timedelta(12),
                "notes": None,
                "lines": [("Leatherette Sofa Set 3+2",2,65000),("Platform Bed (King Size)",2,38000),("Dressing Table with Mirror",2,16000)],
                "creator": sales2,
            },
            {
                "customer": custs[5], "status": SalesOrderStatus.confirmed,
                "order_date": today-timedelta(6), "delivery": today+timedelta(18),
                "notes": "VIP customer — ensure premium packaging",
                "lines": [("Wardrobe 4-Door Hinged",2,42000),("Platform Bed (King Size)",1,38000),("Dressing Table with Mirror",1,16000)],
                "creator": sales1,
            },
            {
                "customer": custs[6], "status": SalesOrderStatus.draft,
                "order_date": today-timedelta(4), "delivery": today+timedelta(25),
                "notes": "Awaiting payment confirmation",
                "lines": [("Bamboo Bookshelf 6-Tier",5,14000),("Floating Wall Shelf Set",6,8500),("Shoe Cabinet 4-Tier",4,6500)],
                "creator": sales3,
            },
            {
                "customer": custs[7], "status": SalesOrderStatus.draft,
                "order_date": today-timedelta(3), "delivery": today+timedelta(22),
                "notes": None,
                "lines": [("Kids Study Table & Chair Set",8,11000),("Bamboo Bookshelf 6-Tier",3,14000),("Computer Workstation Desk",2,24000)],
                "creator": sales2,
            },
            {
                "customer": custs[8], "status": SalesOrderStatus.cancelled,
                "order_date": today-timedelta(22), "delivery": today-timedelta(12),
                "notes": "Customer cancelled — shifted to competitor",
                "lines": [("Rosewood Executive Desk",1,32000),("Leatherette Sofa Set 3+2",1,65000)],
                "creator": sales1,
            },
            {
                "customer": custs[9], "status": SalesOrderStatus.draft,
                "order_date": today-timedelta(2), "delivery": today+timedelta(28),
                "notes": None,
                "lines": [("Coffee Table (Glass Top)",3,12500),("Recliner Chair (Leatherette)",2,22000),("Bar Stool Set (2pcs)",4,7500)],
                "creator": sales3,
            },
            {
                "customer": custs[10], "status": SalesOrderStatus.draft,
                "order_date": today-timedelta(1), "delivery": today+timedelta(30),
                "notes": "First order from this customer — follow up",
                "lines": [("Wardrobe 4-Door Hinged",1,42000),("Dressing Table with Mirror",1,16000),("Shoe Cabinet 4-Tier",2,6500)],
                "creator": sales2,
            },
            {
                "customer": custs[11], "status": SalesOrderStatus.draft,
                "order_date": today, "delivery": today+timedelta(35),
                "notes": "Large order — schedule plant visit",
                "lines": [("Bamboo Dining Table 6-Seat",3,28000),("Leatherette Sofa Set 3+2",2,65000),
                          ("Platform Bed (King Size)",2,38000),("Bamboo Bookshelf 6-Tier",4,14000)],
                "creator": sales1,
            },
        ]

        so_count = 0
        for sod in so_defs:
            so_count += 1
            so = SalesOrder(
                name=f"SO-{so_count:04d}",
                customer_id=sod["customer"].id,
                status=sod["status"],
                order_date=sod["order_date"],
                expected_delivery_date=sod.get("delivery"),
                notes=sod.get("notes"),
                created_by=sod["creator"].id,
            )
            db.add(so)
            db.flush()
            for pname, qty, price in sod["lines"]:
                prod = fg.get(pname)
                if not prod:
                    continue
                qty_delivered = Decimal("0")
                if sod["status"] == SalesOrderStatus.fully_delivered:
                    qty_delivered = Decimal(str(qty))
                elif sod["status"] == SalesOrderStatus.partially_delivered:
                    qty_delivered = Decimal(str(qty // 2))
                db.add(SalesOrderLine(
                    order_id=so.id, product_id=prod.id,
                    qty_ordered=Decimal(str(qty)),
                    qty_delivered=qty_delivered,
                    unit_price=Decimal(str(price)),
                ))
            add_audit(db, "CREATE", "sales_order", so.id, so.name,
                      new_values={"customer": sod["customer"].name, "status": sod["status"].value},
                      user_id=sod["creator"].id)
            if sod["status"] in (SalesOrderStatus.confirmed, SalesOrderStatus.partially_delivered, SalesOrderStatus.fully_delivered):
                add_audit(db, "CONFIRM", "sales_order", so.id, so.name,
                          new_values={"confirmed_by": sod["creator"].full_name},
                          user_id=owner.id)
        db.commit()
        print(f"  + {len(so_defs)} sales orders")

        # ── Extra Audit Logs ─────────────────────────────────────────
        extra_audits = [
            ("UPDATE", "product", None, "Rosewood Plank 6ft",
             {"sales_price": "1050"}, {"sales_price": "1100"}, purchase.id, "Price revision from vendor"),
            ("UPDATE", "product", None, "HR Foam 5inch",
             {"on_hand_qty": "340"}, {"on_hand_qty": "350"}, inv_usr.id, "Stock correction after physical count"),
            ("LOGIN",  "user",    None, "admin@shiv.com",
             None, {"ip": "192.168.1.10"}, admin.id, "Admin login"),
            ("LOGIN",  "user",    None, "sales@shiv.com",
             None, {"ip": "192.168.1.15"}, sales1.id, "Sales user login"),
            ("UPDATE", "user",    None, "mfg2@shiv.com",
             {"role": "sales"}, {"role": "manufacturing"}, admin.id, "Role correction"),
        ]
        for action, etype, eid, ename, old_v, new_v, uid, notes in extra_audits:
            add_audit(db, action, etype, eid, ename, old_values=old_v, new_values=new_v, user_id=uid, notes=notes)
        db.commit()
        print(f"  + {len(extra_audits)} extra audit log entries")

        print("\n✅ Seed 2 complete! Login credentials:")
        print("  admin@shiv.com       / admin123      (Admin)")
        print("  owner@shiv.com       / owner123      (Owner)")
        print("  sales@shiv.com       / sales123      (Sales)")
        print("  sales2@shiv.com      / sales123      (Sales)")
        print("  sales3@shiv.com      / sales123      (Sales)")
        print("  purchase@shiv.com    / purchase123   (Purchase)")
        print("  inventory@shiv.com   / inv123        (Inventory)")
        print("  mfg@shiv.com         / mfg123        (Manufacturing)")
        print("  mfg2@shiv.com        / mfg123        (Manufacturing)")

        print("\nData summary:")
        print(f"  Vendors:               {len(vendor_rows)}")
        print(f"  Customers:             {len(customer_rows)}")
        print(f"  Work Centers:          {len(wc_rows)}")
        print(f"  Raw Materials:         {len(raw_defs)}")
        print(f"  Finished Goods:        {len(fg_defs)}")
        print(f"  Bills of Materials:    {len(boms)}")
        print(f"  Purchase Orders:       {len(po_defs)}")
        print(f"  Manufacturing Orders:  {len(mo_defs)}")
        print(f"  Sales Orders:          {len(so_defs)}")
        print(f"  Stock Ledger Entries:  {len(ledger_entries)}")

    except Exception as e:
        db.rollback()
        print(f"\n❌ Seed 2 failed: {e}")
        import traceback; traceback.print_exc()
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    run()
