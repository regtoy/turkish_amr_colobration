from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from ..config import get_settings
from ..database import get_session
from ..enums import Role
from ..models import User
from ..schemas import TokenResponse, UserCreate, UserLogin, UserPublic
from ..services.audit import log_action
from ..services.security import create_access_token, hash_password, verify_password
from ..dependencies import CurrentUser, admin_user, get_current_user_allow_pending

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserPublic, status_code=status.HTTP_201_CREATED)
def register_user(payload: UserCreate, session: Session = Depends(get_session)) -> UserPublic:
    existing = session.exec(select(User).where(User.username == payload.username)).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Kullanıcı adı kullanılıyor")
    user = User(
        username=payload.username,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role=Role.PENDING,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@router.post("/token", response_model=TokenResponse, summary="JWT ile giriş yap")
def login_user(payload: UserLogin, session: Session = Depends(get_session)) -> TokenResponse:
    user = session.exec(select(User).where(User.username == payload.username)).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Geçersiz kimlik bilgileri")
    if not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Geçersiz kimlik bilgileri")

    settings = get_settings()
    access_token = create_access_token(
        subject=str(user.id),
        role=user.role,
        expires_delta=timedelta(minutes=settings.access_token_expire_minutes),
    )
    return TokenResponse(access_token=access_token, token_type="bearer", user_id=user.id, role=user.role)


@router.get("/me", response_model=UserPublic)
def me(current_user: User = Depends(get_current_user_allow_pending)) -> UserPublic:
    return current_user


@router.get("/pending", response_model=list[UserPublic])
def list_pending_users(session: Session = Depends(get_session), _: CurrentUser = Depends(admin_user)) -> list[UserPublic]:
    return list(session.exec(select(User).where(User.role == Role.PENDING)))


@router.post("/approve/{user_id}", response_model=UserPublic)
def approve_user(
    user_id: int, session: Session = Depends(get_session), admin: CurrentUser = Depends(admin_user)
) -> UserPublic:
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Kullanıcı bulunamadı")
    if user.role != Role.PENDING:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Kullanıcı zaten onaylanmış")

    before_role = user.role
    user.role = Role.GUEST
    user.is_active = True
    session.add(user)
    log_action(
        session,
        actor_id=admin.user_id,
        actor_role=admin.acting_role,
        action="user_approved",
        entity_type="user",
        entity_id=user.id,
        before_status=before_role.value,
        after_status=user.role.value,
        metadata={"approved_at": datetime.utcnow().isoformat()},
    )
    session.commit()
    session.refresh(user)
    return user
