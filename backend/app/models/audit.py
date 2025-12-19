from datetime import datetime
from typing import Optional, Union

from sqlalchemy import JSON, Column
from sqlmodel import Field, SQLModel

JSONPrimitive = Union[str, int, float, bool, None]
JSONValue = Union[JSONPrimitive, list["JSONValue"], dict[str, "JSONValue"]]


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
    metadata: Optional[dict[str, JSONValue]] = Field(default=None, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
