from datetime import datetime
from typing import Optional

from sqlalchemy import UniqueConstraint
from sqlmodel import Field, SQLModel

from ..enums import Role


class ProjectMembership(SQLModel, table=True):
    __table_args__ = (UniqueConstraint("user_id", "project_id", name="uq_project_membership_user_project"),)

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", nullable=False, index=True)
    project_id: int = Field(foreign_key="project.id", nullable=False, index=True)
    role: Role = Field(nullable=False)
    is_active: bool = Field(default=False, nullable=False)
    approved_at: Optional[datetime] = Field(default=None, nullable=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
