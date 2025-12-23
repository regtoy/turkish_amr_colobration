from datetime import datetime
from typing import Any, Optional

from sqlalchemy import JSON, Column
from sqlmodel import Field, SQLModel

JSONValue = Any


class AuditLog(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    actor_id: Optional[int] = Field(default=None, index=True)
    actor_role: Optional[str] = Field(default=None, max_length=50)
    action: str = Field(nullable=False, max_length=120)
    entity_type: str = Field(nullable=False, max_length=64)
    entity_id: Optional[int] = Field(default=None, index=True)
    before_status: Optional[str] = Field(default=None, max_length=64)
    after_status: Optional[str] = Field(default=None, max_length=64)
    project_id: Optional[int] = Field(default=None, index=True)
    meta: Optional[dict[str, JSONValue]] = Field(default=None, sa_column=Column("metadata", JSON))
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
