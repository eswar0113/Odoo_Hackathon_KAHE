from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate, UserProfileUpdate, ChangePasswordRequest, UserOut, Token, LoginRequest
from app.core.security import hash_password, verify_password, create_access_token
from app.core.deps import get_current_user, require_admin
from app.services.audit import log_action
from app.config import settings

router = APIRouter(prefix="/api/auth", tags=["Auth"])


@router.post("/register", response_model=UserOut, status_code=201)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    # Admin role requires the secret key — no other way in
    if payload.role == "admin":
        if not payload.admin_secret or payload.admin_secret != settings.ADMIN_SECRET_KEY:
            raise HTTPException(status_code=403, detail="Invalid admin secret key")

    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=payload.email,
        full_name=payload.full_name,
        password_hash=hash_password(payload.password),
        role=payload.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    log_action(db, "CREATE", "user", user.id, user.email, new_values={"role": str(payload.role)})
    db.commit()
    return user


@router.post("/login", response_model=Token)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email, User.is_active == True).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token(str(user.id))
    return {"access_token": token, "token_type": "bearer", "user": user}


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=UserOut)
def update_me(
    payload: UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    changes = payload.model_dump(exclude_none=True)
    for k, v in changes.items():
        setattr(current_user, k, v)
    db.commit()
    db.refresh(current_user)
    log_action(db, "UPDATE", "user", current_user.id, current_user.email,
               new_values=changes, user_id=current_user.id)
    db.commit()
    return current_user


@router.post("/change-password")
def change_password(
    payload: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if len(payload.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")
    current_user.password_hash = hash_password(payload.new_password)
    db.commit()
    log_action(db, "UPDATE", "user", current_user.id, current_user.email,
               new_values={"action": "password_changed"}, user_id=current_user.id)
    db.commit()
    return {"message": "Password changed successfully"}


@router.get("/users", response_model=list[UserOut])
def list_users(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    return db.query(User).order_by(User.created_at).all()


@router.patch("/users/{user_id}", response_model=UserOut)
def update_user(
    user_id: str,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    target = db.query(User).filter(User.id == UUID(user_id)).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if str(target.id) == str(current_user.id):
        raise HTTPException(status_code=400, detail="Cannot modify your own account")
    changes = payload.model_dump(exclude_none=True)
    for k, v in changes.items():
        setattr(target, k, v)
    db.commit()
    db.refresh(target)
    log_action(db, "UPDATE", "user", target.id, target.email,
               new_values=changes, user_id=current_user.id)
    db.commit()
    return target
