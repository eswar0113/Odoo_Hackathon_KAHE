"""
Seed script for Shiv Furniture Works Mini ERP.
Run from the backend directory:
    python seed.py
"""
import sys
import os
from datetime import date, timedelta
from decimal import Decimal

sys.path.insert(0, os.path.dirname(__file__))

from sqlalchemy import text
from app.database import SessionLocal
from app.core.security import hash_password
from app.models.user import User, UserRole
from app.models.vendor import Vendor
from app.models.customer import Customer
from app.models.product import Product, ProcurementType, ProcurementStrategy
from app.models.purchase import PurchaseOrder, PurchaseOrderLine, PurchaseOrderStatus
from app.models.sales import SalesOrder, SalesOrderLine, SalesOrderStatus
from app.models.manufacturing import (
    ManufacturingOrder, ManufacturingOrderComponent, WorkOrder,
    BOM, BOMLine, BOMOperation, WorkCenter, MOStatus, WorkOrderStatus
)


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


def run():
    db = SessionLocal()
    try:
        print("Seeding Shiv Furniture Works ERP...")
        clear_db(db)

        # ── Users ────────────────────────────────────────────────────
        user_data = [
            ("admin@shiv.com",     "Admin User",     "admin123",    UserRole.admin),
            ("owner@shiv.com",     "Rajesh Sharma",  "owner123",    UserRole.owner),
            ("sales@shiv.com",     "Priya Nair",     "sales123",    UserRole.sales),
            ("sales2@shiv.com",    "Arjun Mehta",    "sales123",    UserRole.sales),
            ("purchase@shiv.com",  "Deepak Verma",   "purchase123", UserRole.purchase),
            ("inventory@shiv.com", "Kavya Reddy",    "inv123",      UserRole.inventory),
            ("mfg@shiv.com",       "Suresh Kumar",   "mfg123",      UserRole.manufacturing),
        ]
        for email, name, pwd, role in user_data:
            if not db.query(User).filter(User.email == email).first():
                db.add(User(email=email, full_name=name, password_hash=hash_password(pwd), role=role))
        db.commit()

        admin        = db.query(User).filter(User.email == "admin@shiv.com").first()
        purchase_usr = db.query(User).filter(User.email == "purchase@shiv.com").first()
        mfg_usr      = db.query(User).filter(User.email == "mfg@shiv.com").first()
        sales_usr    = db.query(User).filter(User.email == "sales@shiv.com").first()
        print(f"  + {len(user_data)} users")

        # ── Vendors ──────────────────────────────────────────────────
        vendor_rows = [
            ("Teak & Oak Timber Co.",    "timber@teakoak.com",        "+91-9810001001", "Mandideep Industrial Area, Bhopal, MP"),
            ("National Ply Industries",  "orders@nationalply.com",    "+91-9820002002", "Perambur, Chennai, TN"),
            ("SteelFit Hardware",        "supply@steelfit.com",       "+91-9830003003", "Peenya Industrial Estate, Bangalore, KA"),
            ("FoamTech Upholstery",      "sales@foamtech.com",        "+91-9840004004", "Bhiwandi, Thane, MH"),
            ("Decor Glass & Mirror",     "info@decorglass.com",       "+91-9850005005", "Sahibabad Industrial Area, UP"),
            ("Craftwood Supplies",       "craft@craftwood.com",       "+91-9860006006", "Kundanahalli, Bangalore, KA"),
            ("Premier Fasteners Ltd.",   "bulk@premierfasteners.com", "+91-9870007007", "Ludhiana, Punjab"),
            ("ArtFinish Paints",         "orders@artfinish.com",      "+91-9880008008", "Bhosari MIDC, Pune, MH"),
        ]
        for name, email, phone, address in vendor_rows:
            if not db.query(Vendor).filter(Vendor.name == name).first():
                db.add(Vendor(name=name, email=email, phone=phone, address=address))
        db.commit()

        def vendor(name):
            return db.query(Vendor).filter(Vendor.name == name).first()

        v_timber    = vendor("Teak & Oak Timber Co.")
        v_ply       = vendor("National Ply Industries")
        v_steel     = vendor("SteelFit Hardware")
        v_foam      = vendor("FoamTech Upholstery")
        v_glass     = vendor("Decor Glass & Mirror")
        v_craftwood = vendor("Craftwood Supplies")
        v_fasteners = vendor("Premier Fasteners Ltd.")
        v_paint     = vendor("ArtFinish Paints")
        print(f"  + {len(vendor_rows)} vendors")

        # ── Customers ────────────────────────────────────────────────
        customer_rows = [
            ("Greenwood Interiors",      "orders@greenwoodinteriors.com",   "+91-9901001001", "MG Road, Bangalore, KA 560001"),
            ("Homestyle Furniture Mart", "purchase@homestylefurniture.com", "+91-9901002002", "Anna Nagar, Chennai, TN 600040"),
            ("Urban Living Spaces",      "info@urbanlivingspaces.com",      "+91-9901003003", "Bandra West, Mumbai, MH 400050"),
            ("Prestige Home Decor",      "buying@prestigehomedecor.com",    "+91-9901004004", "Connaught Place, New Delhi 110001"),
            ("Classic Furniture House",  "orders@classicfurniture.com",     "+91-9901005005", "Hitech City, Hyderabad, TS 500081"),
            ("Modi Enterprises",         "modienterprises@gmail.com",       "+91-9901006006", "Ahmedabad, Gujarat 380001"),
            ("Royal Decor Palace",       "royal@royaldecor.com",            "+91-9901007007", "Jaipur, Rajasthan 302001"),
            ("The Furniture Studio",     "studio@furniturestudio.in",       "+91-9901008008", "Koregaon Park, Pune, MH 411001"),
            ("HomeNest Retail",          "homenest@gmail.com",              "+91-9901009009", "Salt Lake, Kolkata, WB 700091"),
            ("Comfort Zone Interiors",   "comfort@czinteriors.com",         "+91-9901010010", "Gomti Nagar, Lucknow, UP 226010"),
        ]
        for name, email, phone, address in customer_rows:
            if not db.query(Customer).filter(Customer.name == name).first():
                db.add(Customer(name=name, email=email, phone=phone, address=address))
        db.commit()

        def customer(name):
            return db.query(Customer).filter(Customer.name == name).first()

        custs = [customer(r[0]) for r in customer_rows]
        print(f"  + {len(customer_rows)} customers")

        # ── Work Centers ─────────────────────────────────────────────
        wc_rows = [
            ("Carpentry Station",  "Primary wood cutting and shaping"),
            ("Assembly Line A",    "Main assembly line for large pieces"),
            ("Assembly Line B",    "Secondary assembly line for small pieces"),
            ("Upholstery Station", "Foam cutting, fabric stitching and fitting"),
            ("Paint & Finish Bay", "Sanding, painting and polishing"),
            ("Quality Check",      "Final inspection and verification"),
        ]
        for name, desc in wc_rows:
            if not db.query(WorkCenter).filter(WorkCenter.name == name).first():
                db.add(WorkCenter(name=name, description=desc))
        db.commit()

        def wc(name):
            return db.query(WorkCenter).filter(WorkCenter.name == name).first()

        wc_carp  = wc("Carpentry Station")
        wc_asm_a = wc("Assembly Line A")
        wc_asm_b = wc("Assembly Line B")
        wc_uphol = wc("Upholstery Station")
        wc_paint = wc("Paint & Finish Bay")
        wc_qc    = wc("Quality Check")
        print(f"  + {len(wc_rows)} work centers")

        # ── Raw Materials ────────────────────────────────────────────
        def upsert_product(name, **kwargs):
            p = db.query(Product).filter(Product.name == name).first()
            if not p:
                p = Product(name=name, **kwargs)
                db.add(p)
                db.flush()
            return p

        raw = {}
        raw_rows = [
            # name                          cat             uom    sp    cp    oh   rp   rq   vendor
            ("Teak Wood Plank (6ft)",    "Raw Material", "pcs",  850,  620, 200, 50, 100, v_timber),
            ("Teak Wood Plank (4ft)",    "Raw Material", "pcs",  550,  390, 180, 50, 100, v_timber),
            ("Commercial Plywood 18mm",  "Raw Material", "sheet",480,  350, 150, 40,  80, v_ply),
            ("Commercial Plywood 12mm",  "Raw Material", "sheet",360,  260, 120, 40,  80, v_ply),
            ("MDF Board 18mm",           "Raw Material", "sheet",320,  230, 100, 30,  60, v_ply),
            ("Steel Rod 10mm",           "Raw Material", "kg",    95,   68, 500,100, 200, v_steel),
            ("Steel Angle Iron",         "Raw Material", "kg",    88,   62, 400, 80, 150, v_steel),
            ("High Density Foam 4inch",  "Raw Material", "sqft",  75,   55, 300, 80, 150, v_foam),
            ("High Density Foam 2inch",  "Raw Material", "sqft",  45,   32, 250, 60, 100, v_foam),
            ("Fabric - Brown Linen",     "Raw Material", "meter",220,  160, 150, 40,  80, v_foam),
            ("Fabric - Grey Velvet",     "Raw Material", "meter",280,  200, 100, 30,  60, v_foam),
            ("Mirror Glass 5mm",         "Raw Material", "sqft", 180,  130,  80, 20,  40, v_glass),
            ("Wood Screws (box 100)",    "Raw Material", "box",   85,   60, 200, 50, 100, v_fasteners),
            ("L-Brackets (set 4)",       "Raw Material", "set",   65,   45, 250, 60, 120, v_fasteners),
            ("Wood Stain - Walnut",      "Raw Material", "ltr",  320,  230,  60, 20,  40, v_paint),
            ("Wood Polish - Clear",      "Raw Material", "ltr",  280,  200,  60, 20,  40, v_paint),
            ("Rubber Leg Pad (set 4)",   "Raw Material", "set",   40,   28, 300, 60, 100, v_fasteners),
            ("Drawer Slide Rail (pair)", "Raw Material", "pair", 180,  130, 100, 30,  60, v_steel),
            ("Door Hinge (pair)",        "Raw Material", "pair",  55,   38, 200, 50, 100, v_fasteners),
            ("Sandpaper Pack (assorted)","Raw Material", "pack", 120,   85,  80, 20,  40, v_paint),
        ]
        for name, cat, uom, sp, cp, oh, rp, rq, v in raw_rows:
            raw[name] = upsert_product(
                name, category=cat, unit_of_measure=uom,
                sales_price=Decimal(str(sp)), cost_price=Decimal(str(cp)),
                on_hand_qty=Decimal(str(oh)), reserved_qty=Decimal("0"),
                procure_on_demand=True, procurement_type=ProcurementType.purchase,
                procurement_strategy=ProcurementStrategy.mts,
                reorder_point=Decimal(str(rp)), reorder_qty=Decimal(str(rq)),
                vendor_id=v.id,
            )
        db.commit()
        print(f"  + {len(raw_rows)} raw material products")

        # ── Finished Goods ───────────────────────────────────────────
        fg = {}
        fg_rows = [
            # name                          cat                 uom    sp      cp    oh  strategy    ptype           vendor
            ("Teak Executive Desk",        "Office Furniture",  "pcs", 28500, 18000, 15, "mto", "manufacturing", None),
            ("Teak Dining Table 6-Seater", "Dining Furniture",  "pcs", 35000, 22000, 10, "mto", "manufacturing", None),
            ("Teak Dining Table 4-Seater", "Dining Furniture",  "pcs", 24000, 15500, 12, "mts", "manufacturing", None),
            ("Wooden Sofa Set 3+1+1",      "Living Room",       "set", 52000, 34000,  8, "mto", "manufacturing", None),
            ("L-Shaped Office Desk",       "Office Furniture",  "pcs", 22000, 14000, 10, "mts", "manufacturing", None),
            ("Wooden Study Table",         "Study Furniture",   "pcs",  9500,  6200, 20, "mts", "manufacturing", None),
            ("Wooden Bookshelf 5-Tier",    "Storage",           "pcs", 12000,  7800, 15, "mts", "manufacturing", None),
            ("Wardrobe 3-Door Sliding",    "Bedroom Furniture", "pcs", 38000, 24000,  6, "mto", "manufacturing", None),
            ("Double Bed Frame (Queen)",   "Bedroom Furniture", "pcs", 32000, 20500,  8, "mts", "manufacturing", None),
            ("Bedside Table",              "Bedroom Furniture", "pcs",  6500,  4200, 25, "mts", "manufacturing", None),
            ("TV Unit Cabinet",            "Living Room",       "pcs", 18000, 11500, 12, "mts", "manufacturing", None),
            ("Shoe Rack 3-Tier",           "Storage",           "pcs",  4500,  2900, 30, "mts", "manufacturing", None),
            ("Kitchen Cabinet Set",        "Kitchen",           "set", 45000, 29000,  5, "mto", "manufacturing", None),
            ("Corner Shelf Unit",          "Storage",           "pcs",  5500,  3500, 20, "mts", "manufacturing", None),
            ("Office Chair (Ergonomic)",   "Office Furniture",  "pcs", 15000,  9500, 18, "mts", "purchase",       v_craftwood),
            ("Plastic Stool",              "Misc",              "pcs",   850,   550, 50, "mts", "purchase",       v_craftwood),
        ]
        for name, cat, uom, sp, cp, oh, strat, ptype, v in fg_rows:
            fg[name] = upsert_product(
                name, category=cat, unit_of_measure=uom,
                sales_price=Decimal(str(sp)), cost_price=Decimal(str(cp)),
                on_hand_qty=Decimal(str(oh)), reserved_qty=Decimal("0"),
                procure_on_demand=(strat == "mts"),
                procurement_type=ProcurementType.purchase if ptype == "purchase" else ProcurementType.manufacturing,
                procurement_strategy=ProcurementStrategy.mts if strat == "mts" else ProcurementStrategy.mto,
                reorder_point=Decimal("3"), reorder_qty=Decimal("10"),
                vendor_id=v.id if v else None,
            )
        db.commit()
        print(f"  + {len(fg_rows)} finished goods")

        # ── Bills of Materials ───────────────────────────────────────
        bom_defs = [
            {
                "product": "Teak Executive Desk", "name": "Teak Executive Desk BoM", "version": "1.0",
                "components": [
                    ("Teak Wood Plank (6ft)", 4), ("Teak Wood Plank (4ft)", 2),
                    ("Commercial Plywood 18mm", 2), ("Wood Screws (box 100)", 1),
                    ("L-Brackets (set 4)", 2), ("Wood Stain - Walnut", 1),
                    ("Wood Polish - Clear", 1), ("Rubber Leg Pad (set 4)", 1),
                    ("Sandpaper Pack (assorted)", 1),
                ],
                "operations": [
                    ("Wood Cutting & Shaping", wc_carp, 120, 10),
                    ("Assembly",               wc_asm_a, 180, 20),
                    ("Sanding & Finishing",    wc_paint,  90, 30),
                    ("Quality Inspection",     wc_qc,     30, 40),
                ],
            },
            {
                "product": "Teak Dining Table 6-Seater", "name": "6-Seater Dining Table BoM", "version": "1.0",
                "components": [
                    ("Teak Wood Plank (6ft)", 6), ("Teak Wood Plank (4ft)", 4),
                    ("Wood Screws (box 100)", 2), ("Wood Stain - Walnut", 2),
                    ("Wood Polish - Clear", 1), ("Rubber Leg Pad (set 4)", 1),
                    ("Sandpaper Pack (assorted)", 2),
                ],
                "operations": [
                    ("Wood Cutting",         wc_carp,  150, 10),
                    ("Table Top Assembly",   wc_asm_a, 120, 20),
                    ("Leg Fitting",          wc_asm_a,  60, 30),
                    ("Staining & Polish",    wc_paint, 120, 40),
                    ("Quality Inspection",   wc_qc,     30, 50),
                ],
            },
            {
                "product": "Teak Dining Table 4-Seater", "name": "4-Seater Dining Table BoM", "version": "1.0",
                "components": [
                    ("Teak Wood Plank (6ft)", 4), ("Teak Wood Plank (4ft)", 2),
                    ("Wood Screws (box 100)", 1), ("Wood Stain - Walnut", 1),
                    ("Wood Polish - Clear", 1), ("Rubber Leg Pad (set 4)", 1),
                    ("Sandpaper Pack (assorted)", 1),
                ],
                "operations": [
                    ("Wood Cutting",       wc_carp,  120, 10),
                    ("Assembly",           wc_asm_a, 100, 20),
                    ("Staining & Polish",  wc_paint,  90, 30),
                    ("Quality Inspection", wc_qc,     20, 40),
                ],
            },
            {
                "product": "Wooden Sofa Set 3+1+1", "name": "Sofa Set 3+1+1 BoM", "version": "1.0",
                "components": [
                    ("Teak Wood Plank (4ft)", 8), ("Commercial Plywood 12mm", 4),
                    ("High Density Foam 4inch", 60), ("High Density Foam 2inch", 30),
                    ("Fabric - Grey Velvet", 20), ("Wood Screws (box 100)", 2),
                    ("Wood Stain - Walnut", 1), ("Rubber Leg Pad (set 4)", 3),
                    ("Sandpaper Pack (assorted)", 1),
                ],
                "operations": [
                    ("Frame Construction",   wc_carp,  240, 10),
                    ("Frame Assembly",       wc_asm_a, 120, 20),
                    ("Foam Cutting",         wc_uphol, 180, 30),
                    ("Fabric Stitching",     wc_uphol, 240, 40),
                    ("Finishing & Polish",   wc_paint,  60, 50),
                    ("Quality Inspection",   wc_qc,     30, 60),
                ],
            },
            {
                "product": "L-Shaped Office Desk", "name": "L-Shaped Office Desk BoM", "version": "1.0",
                "components": [
                    ("MDF Board 18mm", 3), ("Commercial Plywood 18mm", 2),
                    ("Steel Angle Iron", 5), ("Wood Screws (box 100)", 2),
                    ("L-Brackets (set 4)", 4), ("Wood Stain - Walnut", 1),
                    ("Wood Polish - Clear", 1), ("Rubber Leg Pad (set 4)", 1),
                ],
                "operations": [
                    ("Cutting & Shaping",    wc_carp,  90, 10),
                    ("Metal Frame",          wc_asm_a,  60, 20),
                    ("Board Assembly",       wc_asm_b,  90, 30),
                    ("Finishing",            wc_paint,  60, 40),
                    ("Quality Inspection",   wc_qc,     20, 50),
                ],
            },
            {
                "product": "Wooden Study Table", "name": "Study Table BoM", "version": "1.0",
                "components": [
                    ("Teak Wood Plank (4ft)", 2), ("Commercial Plywood 12mm", 1),
                    ("Wood Screws (box 100)", 1), ("Drawer Slide Rail (pair)", 1),
                    ("Wood Stain - Walnut", 1), ("Rubber Leg Pad (set 4)", 1),
                ],
                "operations": [
                    ("Cutting",           wc_carp,  60, 10),
                    ("Assembly",          wc_asm_b,  90, 20),
                    ("Drawer Fitting",    wc_asm_b,  30, 30),
                    ("Finishing",         wc_paint,  45, 40),
                ],
            },
            {
                "product": "Wooden Bookshelf 5-Tier", "name": "Bookshelf 5-Tier BoM", "version": "1.0",
                "components": [
                    ("Commercial Plywood 18mm", 3), ("MDF Board 18mm", 1),
                    ("Wood Screws (box 100)", 1), ("L-Brackets (set 4)", 2),
                    ("Wood Stain - Walnut", 1), ("Rubber Leg Pad (set 4)", 1),
                ],
                "operations": [
                    ("Cutting",           wc_carp,  45, 10),
                    ("Assembly",          wc_asm_b,  90, 20),
                    ("Finishing",         wc_paint,  45, 30),
                    ("Quality Check",     wc_qc,     15, 40),
                ],
            },
            {
                "product": "Wardrobe 3-Door Sliding", "name": "3-Door Wardrobe BoM", "version": "1.0",
                "components": [
                    ("Commercial Plywood 18mm", 6), ("MDF Board 18mm", 2),
                    ("Mirror Glass 5mm", 15), ("Drawer Slide Rail (pair)", 3),
                    ("Door Hinge (pair)", 6), ("Wood Screws (box 100)", 2),
                    ("L-Brackets (set 4)", 4), ("Wood Stain - Walnut", 2),
                    ("Wood Polish - Clear", 1),
                ],
                "operations": [
                    ("Frame Cutting",         wc_carp,  120, 10),
                    ("Frame Assembly",        wc_asm_a, 180, 20),
                    ("Mirror & Door Fitting", wc_asm_a,  90, 30),
                    ("Finishing",             wc_paint,  60, 40),
                    ("Quality Inspection",    wc_qc,     30, 50),
                ],
            },
            {
                "product": "Double Bed Frame (Queen)", "name": "Queen Bed Frame BoM", "version": "1.0",
                "components": [
                    ("Teak Wood Plank (6ft)", 4), ("Teak Wood Plank (4ft)", 6),
                    ("Commercial Plywood 18mm", 2), ("Wood Screws (box 100)", 2),
                    ("L-Brackets (set 4)", 4), ("Wood Stain - Walnut", 2),
                    ("Wood Polish - Clear", 1), ("Rubber Leg Pad (set 4)", 2),
                    ("Sandpaper Pack (assorted)", 2),
                ],
                "operations": [
                    ("Wood Cutting",        wc_carp,  120, 10),
                    ("Headboard Assembly",  wc_asm_a,  90, 20),
                    ("Frame Assembly",      wc_asm_a, 120, 30),
                    ("Staining & Polish",   wc_paint,  90, 40),
                    ("Quality Inspection",  wc_qc,     20, 50),
                ],
            },
            {
                "product": "TV Unit Cabinet", "name": "TV Unit Cabinet BoM", "version": "1.0",
                "components": [
                    ("MDF Board 18mm", 4), ("Commercial Plywood 12mm", 2),
                    ("Drawer Slide Rail (pair)", 2), ("Door Hinge (pair)", 4),
                    ("Wood Screws (box 100)", 1), ("Wood Stain - Walnut", 1),
                    ("Wood Polish - Clear", 1), ("Rubber Leg Pad (set 4)", 1),
                ],
                "operations": [
                    ("Cutting & Sizing",       wc_carp,  60, 10),
                    ("Cabinet Assembly",       wc_asm_b,  90, 20),
                    ("Door & Drawer Fitting",  wc_asm_b,  60, 30),
                    ("Finishing",              wc_paint,  45, 40),
                ],
            },
            {
                "product": "Bedside Table", "name": "Bedside Table BoM", "version": "1.0",
                "components": [
                    ("Teak Wood Plank (4ft)", 2), ("Commercial Plywood 12mm", 1),
                    ("Drawer Slide Rail (pair)", 1), ("Wood Screws (box 100)", 1),
                    ("Wood Stain - Walnut", 1), ("Rubber Leg Pad (set 4)", 1),
                ],
                "operations": [
                    ("Cutting",          wc_carp,  30, 10),
                    ("Assembly",         wc_asm_b,  45, 20),
                    ("Drawer Fitting",   wc_asm_b,  20, 30),
                    ("Finishing",        wc_paint,  30, 40),
                ],
            },
            {
                "product": "Shoe Rack 3-Tier", "name": "Shoe Rack 3-Tier BoM", "version": "1.0",
                "components": [
                    ("Commercial Plywood 18mm", 1), ("MDF Board 18mm", 1),
                    ("Wood Screws (box 100)", 1), ("L-Brackets (set 4)", 2),
                    ("Wood Stain - Walnut", 1), ("Rubber Leg Pad (set 4)", 1),
                ],
                "operations": [
                    ("Cutting",          wc_carp,  25, 10),
                    ("Assembly",         wc_asm_b,  40, 20),
                    ("Finishing",        wc_paint,  25, 30),
                ],
            },
            {
                "product": "Kitchen Cabinet Set", "name": "Kitchen Cabinet Set BoM", "version": "1.0",
                "components": [
                    ("Commercial Plywood 18mm", 8), ("MDF Board 18mm", 4),
                    ("Commercial Plywood 12mm", 4), ("Drawer Slide Rail (pair)", 6),
                    ("Door Hinge (pair)", 8), ("Wood Screws (box 100)", 3),
                    ("L-Brackets (set 4)", 6), ("Wood Stain - Walnut", 3),
                    ("Wood Polish - Clear", 2),
                ],
                "operations": [
                    ("Panel Cutting",         wc_carp,  180, 10),
                    ("Carcass Assembly",      wc_asm_a, 240, 20),
                    ("Door & Drawer Fitting", wc_asm_b, 150, 30),
                    ("Finishing",             wc_paint,  90, 40),
                    ("Quality Inspection",    wc_qc,     30, 50),
                ],
            },
            {
                "product": "Corner Shelf Unit", "name": "Corner Shelf Unit BoM", "version": "1.0",
                "components": [
                    ("MDF Board 18mm", 2), ("Commercial Plywood 12mm", 1),
                    ("Wood Screws (box 100)", 1), ("L-Brackets (set 4)", 3),
                    ("Wood Stain - Walnut", 1), ("Rubber Leg Pad (set 4)", 1),
                ],
                "operations": [
                    ("Cutting",          wc_carp,  30, 10),
                    ("Assembly",         wc_asm_b,  45, 20),
                    ("Finishing",        wc_paint,  25, 30),
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
            for op in bdef["operations"]:
                op_name, wc_obj, dur, seq = op[0], op[1], op[2], op[3]
                db.add(BOMOperation(bom_id=bom.id, operation_name=op_name,
                                    work_center_id=wc_obj.id, duration_minutes=dur, sequence=seq))
            boms[pname] = bom
        db.commit()
        print(f"  + {len(boms)} bills of materials")

        # ── Purchase Orders ──────────────────────────────────────────
        today = date.today()
        po_rows = [
            {
                "vendor": v_timber, "status": PurchaseOrderStatus.fully_received,
                "order_date": today - timedelta(days=45), "expected_date": today - timedelta(days=30),
                "lines": [("Teak Wood Plank (6ft)", 100, 620), ("Teak Wood Plank (4ft)", 80, 390)],
            },
            {
                "vendor": v_ply, "status": PurchaseOrderStatus.fully_received,
                "order_date": today - timedelta(days=40), "expected_date": today - timedelta(days=25),
                "lines": [("Commercial Plywood 18mm", 60, 350), ("Commercial Plywood 12mm", 50, 260), ("MDF Board 18mm", 40, 230)],
            },
            {
                "vendor": v_foam, "status": PurchaseOrderStatus.partially_received,
                "order_date": today - timedelta(days=20), "expected_date": today + timedelta(days=5),
                "lines": [("High Density Foam 4inch", 150, 55), ("Fabric - Grey Velvet", 60, 200), ("Fabric - Brown Linen", 50, 160)],
            },
            {
                "vendor": v_steel, "status": PurchaseOrderStatus.confirmed,
                "order_date": today - timedelta(days=10), "expected_date": today + timedelta(days=10),
                "lines": [("Steel Rod 10mm", 200, 68), ("Steel Angle Iron", 150, 62), ("Drawer Slide Rail (pair)", 50, 130)],
            },
            {
                "vendor": v_fasteners, "status": PurchaseOrderStatus.draft,
                "order_date": today - timedelta(days=3), "expected_date": today + timedelta(days=14),
                "lines": [("Wood Screws (box 100)", 50, 60), ("L-Brackets (set 4)", 60, 45),
                          ("Rubber Leg Pad (set 4)", 100, 28), ("Door Hinge (pair)", 80, 38)],
            },
            {
                "vendor": v_paint, "status": PurchaseOrderStatus.draft,
                "order_date": today - timedelta(days=2), "expected_date": today + timedelta(days=7),
                "lines": [("Wood Stain - Walnut", 20, 230), ("Wood Polish - Clear", 20, 200),
                          ("Sandpaper Pack (assorted)", 30, 85)],
            },
            {
                "vendor": v_craftwood, "status": PurchaseOrderStatus.confirmed,
                "order_date": today - timedelta(days=8), "expected_date": today + timedelta(days=12),
                "lines": [("Office Chair (Ergonomic)", 10, 9500), ("Plastic Stool", 20, 550)],
            },
            {
                "vendor": v_glass, "status": PurchaseOrderStatus.draft,
                "order_date": today - timedelta(days=1), "expected_date": today + timedelta(days=21),
                "lines": [("Mirror Glass 5mm", 50, 130)],
            },
        ]

        po_count = db.query(PurchaseOrder).count()
        for pod in po_rows:
            po_count += 1
            po = PurchaseOrder(
                name=f"PO-{po_count:04d}",
                vendor_id=pod["vendor"].id,
                status=pod["status"],
                order_date=pod["order_date"],
                expected_date=pod["expected_date"],
                created_by=purchase_usr.id,
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
        db.commit()
        print(f"  + {len(po_rows)} purchase orders")

        # ── Manufacturing Orders ─────────────────────────────────────
        mo_rows = [
            ("Teak Dining Table 4-Seater", 3, MOStatus.done,        today - timedelta(days=20), None,     mfg_usr),
            ("Wooden Study Table",         5, MOStatus.done,        today - timedelta(days=15), None,     mfg_usr),
            ("Wooden Bookshelf 5-Tier",    4, MOStatus.in_progress, today - timedelta(days=5),  None,     mfg_usr),
            ("L-Shaped Office Desk",       3, MOStatus.confirmed,   today + timedelta(days=3),  None,     mfg_usr),
            ("TV Unit Cabinet",            4, MOStatus.confirmed,   today + timedelta(days=5),  None,     mfg_usr),
            ("Bedside Table",              6, MOStatus.draft,       today + timedelta(days=10), None,     None),
            ("Teak Executive Desk",        2, MOStatus.draft,       today + timedelta(days=14), "SO-0003",None),
            ("Wooden Sofa Set 3+1+1",      2, MOStatus.draft,       today + timedelta(days=18), "SO-0005",None),
            ("Wardrobe 3-Door Sliding",    2, MOStatus.draft,       today + timedelta(days=20), None,     None),
            ("Double Bed Frame (Queen)",   3, MOStatus.draft,       today + timedelta(days=22), None,     None),
        ]

        mo_count = db.query(ManufacturingOrder).count()
        for pname, qty, status, sched, origin, assignee in mo_rows:
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
        db.commit()
        print(f"  + {len(mo_rows)} manufacturing orders")

        # ── Sales Orders ─────────────────────────────────────────────
        so_rows = [
            {
                "customer": custs[0], "status": SalesOrderStatus.fully_delivered,
                "order_date": today - timedelta(days=30), "delivery_date": today - timedelta(days=22),
                "notes": "Urgent order for showroom display",
                "lines": [("Teak Dining Table 4-Seater", 2, 24000), ("Wooden Bookshelf 5-Tier", 3, 12000), ("Bedside Table", 4, 6500)],
            },
            {
                "customer": custs[1], "status": SalesOrderStatus.fully_delivered,
                "order_date": today - timedelta(days=25), "delivery_date": today - timedelta(days=18),
                "notes": None,
                "lines": [("Wooden Study Table", 5, 9500), ("Wooden Bookshelf 5-Tier", 2, 12000), ("Plastic Stool", 10, 850)],
            },
            {
                "customer": custs[2], "status": SalesOrderStatus.partially_delivered,
                "order_date": today - timedelta(days=18), "delivery_date": today + timedelta(days=5),
                "notes": "Deliver executive desks first",
                "lines": [("Teak Executive Desk", 2, 28500), ("Office Chair (Ergonomic)", 2, 15000), ("L-Shaped Office Desk", 1, 22000)],
            },
            {
                "customer": custs[3], "status": SalesOrderStatus.confirmed,
                "order_date": today - timedelta(days=10), "delivery_date": today + timedelta(days=15),
                "notes": "Corporate bulk order — priority dispatch",
                "lines": [("Teak Executive Desk", 3, 28500), ("L-Shaped Office Desk", 5, 22000),
                          ("Office Chair (Ergonomic)", 8, 15000), ("Wooden Bookshelf 5-Tier", 3, 12000)],
            },
            {
                "customer": custs[4], "status": SalesOrderStatus.confirmed,
                "order_date": today - timedelta(days=8), "delivery_date": today + timedelta(days=12),
                "notes": None,
                "lines": [("Wooden Sofa Set 3+1+1", 2, 52000), ("TV Unit Cabinet", 2, 18000), ("Teak Dining Table 6-Seater", 1, 35000)],
            },
            {
                "customer": custs[5], "status": SalesOrderStatus.draft,
                "order_date": today - timedelta(days=3), "delivery_date": today + timedelta(days=20),
                "notes": "Waiting for final confirmation from customer",
                "lines": [("Double Bed Frame (Queen)", 2, 32000), ("Wardrobe 3-Door Sliding", 2, 38000), ("Bedside Table", 4, 6500)],
            },
            {
                "customer": custs[6], "status": SalesOrderStatus.draft,
                "order_date": today - timedelta(days=2), "delivery_date": today + timedelta(days=25),
                "notes": None,
                "lines": [("Kitchen Cabinet Set", 1, 45000), ("TV Unit Cabinet", 1, 18000), ("Corner Shelf Unit", 3, 5500)],
            },
            {
                "customer": custs[7], "status": SalesOrderStatus.cancelled,
                "order_date": today - timedelta(days=20), "delivery_date": today - timedelta(days=10),
                "notes": "Customer cancelled — budget constraints",
                "lines": [("Teak Dining Table 6-Seater", 1, 35000), ("Wooden Sofa Set 3+1+1", 1, 52000)],
            },
            {
                "customer": custs[8], "status": SalesOrderStatus.draft,
                "order_date": today - timedelta(days=1), "delivery_date": today + timedelta(days=30),
                "notes": "New customer — verify address before dispatch",
                "lines": [("Wooden Study Table", 3, 9500), ("Bedside Table", 6, 6500), ("Shoe Rack 3-Tier", 4, 4500)],
            },
            {
                "customer": custs[9], "status": SalesOrderStatus.draft,
                "order_date": today, "delivery_date": today + timedelta(days=21),
                "notes": None,
                "lines": [("Double Bed Frame (Queen)", 1, 32000), ("Bedside Table", 2, 6500),
                          ("Wardrobe 3-Door Sliding", 1, 38000), ("Corner Shelf Unit", 2, 5500)],
            },
        ]

        so_count = db.query(SalesOrder).count()
        for sod in so_rows:
            so_count += 1
            so = SalesOrder(
                name=f"SO-{so_count:04d}",
                customer_id=sod["customer"].id,
                status=sod["status"],
                order_date=sod["order_date"],
                expected_delivery_date=sod.get("delivery_date"),
                notes=sod.get("notes"),
                created_by=sales_usr.id,
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
        db.commit()
        print(f"  + {len(so_rows)} sales orders")

        print("\n✅ Seed complete! Login credentials:")
        print("  admin@shiv.com       / admin123      (Admin)")
        print("  owner@shiv.com       / owner123      (Owner)")
        print("  sales@shiv.com       / sales123      (Sales)")
        print("  purchase@shiv.com    / purchase123   (Purchase)")
        print("  inventory@shiv.com   / inv123        (Inventory)")
        print("  mfg@shiv.com         / mfg123        (Manufacturing)")

    except Exception as e:
        db.rollback()
        print(f"\n❌ Seed failed: {e}")
        import traceback; traceback.print_exc()
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    run()
