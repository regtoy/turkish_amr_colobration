from typing import Any, Optional

from sqlmodel import Session

from ..enums import Role, SentenceStatus
from ..models import AuditLog


def _normalize_status(status: Optional[SentenceStatus | str]) -> Optional[str]:
    if status is None:
        return None
    if isinstance(status, SentenceStatus):
        return status.value
    return str(status)


def log_action(
    session: Session,
    *,
    actor_id: Optional[int],
    actor_role: Optional[Role],
    action: str,
    entity_type: str,
    entity_id: Optional[int],
    before_status: Optional[SentenceStatus | str] = None,
    after_status: Optional[SentenceStatus | str] = None,
    metadata: Optional[dict[str, Any]] = None,
) -> None:
    """Persist an audit log entry without committing the transaction."""

    entry = AuditLog(
        actor_id=actor_id,
        actor_role=actor_role.value if actor_role else None,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        before_status=_normalize_status(before_status),
        after_status=_normalize_status(after_status),
        metadata=metadata or None,
    )
    session.add(entry)
