from dataclasses import dataclass
from typing import Optional

from fastapi import Depends, Header, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlmodel import Session, select

from .database import get_session
from .enums import Role
from .models import ProjectMembership, Sentence, User
from .services.security import decode_access_token


@dataclass
class CurrentUser:
    user_id: int
    role: Role
    project_id: Optional[int] = None
    project_role: Optional[Role] = None

    @property
    def acting_role(self) -> Role:
        return self.project_role or self.role


bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    x_user_id: Optional[str] = Header(default=None, alias="X-User-Id"),
    x_user_role: Optional[str] = Header(default=None, alias="X-User-Role"),
    x_project_id: Optional[str] = Header(default=None, alias="X-Project-Id"),
    session: Session = Depends(get_session),
) -> CurrentUser:
    if credentials and credentials.scheme.lower() == "bearer":
        payload = decode_access_token(credentials.credentials)
        try:
            user_id = int(payload["sub"])
            role = Role(payload["role"])
        except (KeyError, TypeError, ValueError) as exc:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token yükü geçersiz") from exc
        user = session.get(User, user_id)
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Kullanıcı aktif değil veya bulunamadı"
            )
        if user.role != role:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Rol bilgisi ile kullanıcı eşleşmiyor")
        if user.role == Role.PENDING:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Kullanıcı onay bekliyor")
        return _attach_project_context(user, role, request, x_project_id, session)

    if x_user_id is None or x_user_role is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Kimlik doğrulaması eksik. Authorization: Bearer veya X-User-Id ve X-User-Role header'larını sağlayın.",
        )
    try:
        user_id = int(x_user_id)
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Geçersiz X-User-Id") from exc
    try:
        role = Role(x_user_role)
    except ValueError as exc:  # pragma: no cover - defensive
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Geçersiz rol") from exc

    user = session.get(User, user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Kullanıcı aktif değil veya bulunamadı")

    if user.role != role:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Rol bilgisi ile kullanıcı eşleşmiyor")

    if user.role == Role.PENDING:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Kullanıcı onay bekliyor")

    return _attach_project_context(user, role, request, x_project_id, session)


def admin_user(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    if user.role != Role.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Yalnızca admin kullanıcılar erişebilir")
    return user


async def get_current_user_allow_pending(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    session: Session = Depends(get_session),
) -> User:
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Kimlik doğrulama bilgileri sağlanmadı",
        )

    payload = decode_access_token(credentials.credentials)
    try:
        user_id = int(payload["sub"])
        role = Role(payload["role"])
    except (KeyError, TypeError, ValueError) as exc:  # pragma: no cover - defensive
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token yükü geçersiz") from exc

    user = session.get(User, user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Kullanıcı aktif değil veya bulunamadı")

    if user.role != role:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Rol bilgisi ile kullanıcı eşleşmiyor")

    return user


def _resolve_project_id(request: Request, x_project_id: Optional[str]) -> Optional[int]:
    project_id: Optional[int] = None
    if x_project_id:
        try:
            project_id = int(x_project_id)
        except (TypeError, ValueError) as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Geçersiz X-Project-Id") from exc
    elif "project_id" in request.path_params:
        try:
            project_id = int(request.path_params["project_id"])
        except (TypeError, ValueError) as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Geçersiz project_id") from exc
    return project_id


def _attach_project_context(
    user: User, role: Role, request: Request, x_project_id: Optional[str], session: Session
) -> CurrentUser:
    project_id = _resolve_project_id(request, x_project_id)
    project_role: Optional[Role] = None

    if project_id is None and "sentence_id" in request.path_params:
        try:
            sentence_id = int(request.path_params["sentence_id"])
            sentence = session.get(Sentence, sentence_id)
            project_id = sentence.project_id if sentence else None
        except (TypeError, ValueError):
            project_id = None

    if project_id is not None and role not in {Role.ADMIN, Role.ASSIGNMENT_ENGINE}:
        membership = session.exec(
            select(ProjectMembership).where(
                ProjectMembership.user_id == user.id, ProjectMembership.project_id == project_id
            )
        ).first()
        if not membership or not membership.is_active or membership.approved_at is None:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Proje üyeliği onaylanmamış veya pasif")
        project_role = membership.role

    return CurrentUser(user_id=user.id, role=role, project_id=project_id, project_role=project_role)
