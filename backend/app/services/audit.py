from datetime import datetime
from enum import Enum
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


JSONPrimitive = str | int | float | bool | None
JSONValue = JSONPrimitive | list["JSONValue"] | dict[str, "JSONValue"]


def _normalize_value(value: Any) -> JSONValue:
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, Enum):
        return value.value  # type: ignore[return-value]
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, (list, tuple)):
        return [_normalize_value(item) for item in value]
    if isinstance(value, dict):
        return {str(k): _normalize_value(v) for k, v in value.items()}
    return str(value)


def _normalize_metadata(metadata: Optional[dict[str, Any]]) -> Optional[dict[str, JSONValue]]:
    if metadata is None:
        return None
    return {str(key): _normalize_value(value) for key, value in metadata.items()}


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
    project_id: Optional[int] = None,
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
        project_id=project_id,
        meta=_normalize_metadata(metadata),
    )
    session.add(entry)
