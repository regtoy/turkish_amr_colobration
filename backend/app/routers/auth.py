from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from ..config import get_settings
from ..database import get_session
from ..dependencies import CurrentUser, admin_user, get_current_user
from ..enums import Role
from ..models import User
from ..schemas import TokenResponse, UserCreate, UserLogin, UserPublic, UserRoleUpdate
from ..services.security import create_access_token, hash_password, verify_password

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


@router.get("/me", response_model=UserPublic, summary="Mevcut kullanıcı bilgisi")
def read_current_user(
    current: CurrentUser = Depends(get_current_user), session: Session = Depends(get_session)
) -> UserPublic:
    user = session.get(User, current.user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Kullanıcı aktif değil veya bulunamadı")
    return user


@router.patch(
    "/users/{user_id}/role",
    response_model=UserPublic,
    status_code=status.HTTP_200_OK,
    summary="Kullanıcı rolünü veya aktifliğini güncelle (admin)",
)
def update_user_role(
    user_id: int,
    payload: UserRoleUpdate,
    session: Session = Depends(get_session),
    _: CurrentUser = Depends(admin_user),
) -> UserPublic:
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Kullanıcı bulunamadı")

    user.role = payload.role
    if payload.is_active is not None:
        user.is_active = payload.is_active

    session.add(user)
    session.commit()
    session.refresh(user)
    return user
