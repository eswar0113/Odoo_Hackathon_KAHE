"""
Run this once after DB is created to seed admin user and demo data.
Usage: python seed.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from app.database import SessionLocal, Base, engine
import app.models  # noqa

Base.metadata.create_all(bind=engine)

from app.models.user import User, UserRole
from app.models.vendor import Vendor
from app.models.customer import Customer
from app.models.product import Product, ProcurementType, ProcurementStrategy
from app.models.manufacturing import WorkCenter
from app.core.security import hash_password

db = SessionLocal()

# Admin user
if not db.query(User).filter(User.email == "admin@shivfurniture.com").first():
    db.add(User(email="admin@shivfurniture.com", full_name="Admin User", password_hash=hash_password("admin123"), role=UserRole.admin))
    print("Created admin user: admin@shivfurniture.com / admin123")

# Demo users
demo_users = [
    ("sales@shivfurniture.com", "Sales User", UserRole.sales),
    ("purchase@shivfurniture.com", "Purchase Manager", UserRole.purchase),
    ("mfg@shivfurniture.com", "Production Manager", UserRole.manufacturing),
]
for email, name, role in demo_users:
    if not db.query(User).filter(User.email == email).first():
        db.add(User(email=email, full_name=name, password_hash=hash_password("demo123"), role=role))
        print(f"Created {role.value} user: {email} / demo123")

# Vendors
vendor_names = ["Wood Suppliers Co.", "Metal Parts Ltd.", "Paint & Polish Works", "Packaging Solutions"]
vendors = {}
for name in vendor_names:
    v = db.query(Vendor).filter(Vendor.name == name).first()
    if not v:
        v = Vendor(name=name, email=f"contact@{name.lower().replace(' ', '').replace('.', '').replace('&', '')}.com", phone="+91-9000000000")
        db.add(v)
        db.flush()
    vendors[name] = v

# Customers
for name, email in [("Rajesh Enterprises", "rajesh@example.com"), ("Kumar Office Solutions", "kumar@example.com"), ("Modern Interiors", "modern@example.com")]:
    if not db.query(Customer).filter(Customer.email == email).first():
        db.add(Customer(name=name, email=email, phone="+91-8000000000"))

# Work centers
for wc_name, desc in [("Assembly Line", "Main assembly area"), ("Paint Floor", "Painting and finishing"), ("Packaging Unit", "Final packaging")]:
    if not db.query(WorkCenter).filter(WorkCenter.name == wc_name).first():
        db.add(WorkCenter(name=wc_name, description=desc))

db.flush()

# Raw material products
raw_materials = [
    ("Wooden Legs", 150, 80, 500, "pcs"),
    ("Wooden Top (Large)", 800, 500, 100, "pcs"),
    ("Wooden Top (Small)", 400, 250, 200, "pcs"),
    ("Screws (Pack)", 50, 20, 1000, "pcs"),
    ("Paint (Litre)", 250, 150, 50, "litres"),
    ("Packaging Box", 80, 40, 300, "pcs"),
]
for name, sp, cp, qty, uom in raw_materials:
    if not db.query(Product).filter(Product.name == name).first():
        p = Product(
            name=name, sales_price=sp, cost_price=cp, on_hand_qty=qty,
            unit_of_measure=uom, category="Raw Material",
            procure_on_demand=True,
            procurement_type=ProcurementType.purchase,
            procurement_strategy=ProcurementStrategy.mts,
            vendor_id=vendors["Wood Suppliers Co."].id,
            reorder_point=50, reorder_qty=200,
        )
        db.add(p)

# Finished goods
finished_goods = [
    ("Wooden Table", 5000, 2500, 20, "pcs"),
    ("Wooden Chair", 2500, 1200, 50, "pcs"),
    ("Office Desk", 8000, 4000, 10, "pcs"),
]
for name, sp, cp, qty, uom in finished_goods:
    if not db.query(Product).filter(Product.name == name).first():
        p = Product(
            name=name, sales_price=sp, cost_price=cp, on_hand_qty=qty,
            unit_of_measure=uom, category="Finished Goods",
            procure_on_demand=True,
            procurement_type=ProcurementType.manufacturing,
            procurement_strategy=ProcurementStrategy.mto,
            reorder_point=5, reorder_qty=20,
        )
        db.add(p)

db.commit()
print("\nSeed complete! You can now login at http://localhost:5173")
print("Admin: admin@shivfurniture.com / admin123")
db.close()
