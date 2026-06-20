from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.customer import Customer
from app.models.user import User, UserRole
from app.schemas.customer import CustomerCreate, CustomerUpdate, CustomerOut
from app.core.deps import get_current_user, require_roles

router = APIRouter(prefix="/api/customers", tags=["Customers"])
_write = require_roles(UserRole.sales, UserRole.owner, UserRole.admin)


@router.post("", response_model=CustomerOut, status_code=201)
def create_customer(payload: CustomerCreate, db: Session = Depends(get_db), _: User = Depends(_write)):
    customer = Customer(**payload.model_dump())
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer


@router.get("", response_model=List[CustomerOut])
def list_customers(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.query(Customer).order_by(Customer.name).all()


@router.get("/{customer_id}", response_model=CustomerOut)
def get_customer(customer_id: UUID, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer


@router.put("/{customer_id}", response_model=CustomerOut)
def update_customer(customer_id: UUID, payload: CustomerUpdate, db: Session = Depends(get_db), _: User = Depends(_write)):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(customer, field, value)
    db.commit()
    db.refresh(customer)
    return customer
