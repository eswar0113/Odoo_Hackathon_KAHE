from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, UserRole
from app.core.deps import require_roles
from app.services.procurement import check_reorder_points

router = APIRouter(prefix="/api/procurement", tags=["Procurement"])
_write = require_roles(UserRole.admin, UserRole.owner, UserRole.purchase)


@router.post("/run-reorder", summary="Trigger reorder point checks for all products")
def run_reorder_check(
    db: Session = Depends(get_db),
    current_user: User = Depends(_write),
):
    check_reorder_points(db)
    return {"message": "Reorder check completed. Auto POs/MOs created for products below reorder point."}
