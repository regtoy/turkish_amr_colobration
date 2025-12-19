from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlmodel import Session, select

from ..database import get_session
from ..dependencies import CurrentUser, get_current_user
from ..enums import Role
from ..models import AuditLog
from ..schemas import AuditLogPage
from ..services.workflow import require_roles

router = APIRouter(prefix="/audit", tags=["audit"])


MAX_PAGE_SIZE = 200


@router.get("", response_model=AuditLogPage)
def list_audit_logs(
    project_id: Optional[int] = None,
    actor_id: Optional[int] = None,
    entity_type: Optional[str] = None,
    action: Optional[str] = None,
    limit: int = Query(default=50, ge=1, le=MAX_PAGE_SIZE),
    offset: int = Query(default=0, ge=0),
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
) -> AuditLogPage:
    """List audit log entries with optional filters and pagination.

    Admin users can access all logs, whereas curator users must filter by project_id.
    """

    require_roles(user.role, {Role.ADMIN, Role.CURATOR})

    if user.role == Role.CURATOR and project_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Curator kullanıcıları için project_id parametresi zorunludur.",
        )

    conditions = []
    if project_id is not None:
        conditions.append(AuditLog.project_id == project_id)
    if actor_id is not None:
        conditions.append(AuditLog.actor_id == actor_id)
    if entity_type is not None:
        conditions.append(AuditLog.entity_type == entity_type)
    if action is not None:
        conditions.append(AuditLog.action == action)

    total = session.exec(select(func.count()).select_from(AuditLog).where(*conditions)).scalar_one()

    query = (
        select(AuditLog)
        .where(*conditions)
        .order_by(AuditLog.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    items = list(session.exec(query))
    return AuditLogPage(total=total, limit=limit, offset=offset, items=items)
