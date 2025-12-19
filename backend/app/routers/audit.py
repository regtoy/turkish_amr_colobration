from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from ..database import get_session
from ..dependencies import CurrentUser, get_current_user
from ..enums import Role
from ..models import AuditLog
from ..services.workflow import require_roles

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("", response_model=list[AuditLog])
def list_audit_logs(
    project_id: Optional[int] = None,
    actor_id: Optional[int] = None,
    entity_type: Optional[str] = None,
    action: Optional[str] = None,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
) -> list[AuditLog]:
    """List audit log entries with optional filters.

    Admin users can access all logs, whereas curator users must filter by project_id.
    """

    require_roles(user.role, {Role.ADMIN, Role.CURATOR})

    if user.role == Role.CURATOR and project_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Curator kullanıcıları için project_id parametresi zorunludur.",
        )

    query = select(AuditLog)
    if project_id is not None:
        query = query.where(AuditLog.project_id == project_id)
    if actor_id is not None:
        query = query.where(AuditLog.actor_id == actor_id)
    if entity_type is not None:
        query = query.where(AuditLog.entity_type == entity_type)
    if action is not None:
        query = query.where(AuditLog.action == action)

    query = query.order_by(AuditLog.created_at.desc())
    return list(session.exec(query))
