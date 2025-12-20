from dataclasses import dataclass
from typing import Optional

from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .database import get_session
from .enums import Role
from .services.security import decode_access_token


@dataclass
class CurrentUser:
    user_id: int
    role: Role
    project_id: Optional[int] = None


bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    x_user_id: Optional[str] = Header(default=None, alias="X-User-Id"),
    x_user_role: Optional[str] = Header(default=None, alias="X-User-Role"),
) -> CurrentUser:
    if credentials and credentials.scheme.lower() == "bearer":
        payload = decode_access_token(credentials.credentials)
        try:
            user_id = int(payload["sub"])
            role = Role(payload["role"])
        except (KeyError, TypeError, ValueError) as exc:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token yükü geçersiz") from exc
        return CurrentUser(user_id=user_id, role=role)

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

    return CurrentUser(user_id=user.id, role=user.role)


def admin_user(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    if user.role != Role.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Yalnızca admin kullanıcılar erişebilir")
    return user
