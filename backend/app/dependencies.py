from dataclasses import dataclass
from typing import Optional

from fastapi import Depends, Header, HTTPException, status

from .enums import Role


@dataclass
class CurrentUser:
    user_id: int
    role: Role
    project_id: Optional[int] = None


async def get_current_user(
    x_user_id: Optional[str] = Header(default=None, alias="X-User-Id"),
    x_user_role: Optional[str] = Header(default=None, alias="X-User-Role"),
) -> CurrentUser:
    if x_user_id is None or x_user_role is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Kimlik doğrulaması eksik. X-User-Id ve X-User-Role header'larını sağlayın.",
        )
    try:
        user_id = int(x_user_id)
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Geçersiz X-User-Id") from exc
    try:
        role = Role(x_user_role)
    except ValueError as exc:  # pragma: no cover - defensive
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Geçersiz rol") from exc

    return CurrentUser(user_id=user_id, role=role)


def admin_user(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    if user.role != Role.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Yalnızca admin kullanıcılar erişebilir")
    return user
