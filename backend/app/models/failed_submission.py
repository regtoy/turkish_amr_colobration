from datetime import datetime
from typing import Any, Optional

from sqlalchemy import JSON, Column
from sqlmodel import Field, SQLModel

JSONValue = Any


class FailedSubmission(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    project_id: int = Field(foreign_key="project.id", nullable=False, index=True)
    sentence_id: int = Field(foreign_key="sentence.id", nullable=False, index=True)
    assignment_id: Optional[int] = Field(default=None, foreign_key="assignment.id")
    annotation_id: Optional[int] = Field(default=None, foreign_key="annotation.id")
    user_id: Optional[int] = Field(default=None, index=True)
    reviewer_id: Optional[int] = Field(default=None, index=True)
    failure_type: str = Field(nullable=False, max_length=64)
    reason: str = Field(nullable=False, max_length=500)
    details: Optional[dict[str, JSONValue]] = Field(default=None, sa_column=Column(JSON))
    amr_version: Optional[str] = Field(default=None, max_length=64)
    role_set_version: Optional[str] = Field(default=None, max_length=64)
    rule_version: Optional[str] = Field(default=None, max_length=64)
    submitted_penman: Optional[str] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
