from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel


class Project(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True, nullable=False, max_length=120)
    language: str = Field(default="tr", nullable=False, max_length=8)
    amr_version: str = Field(default="1.0", nullable=False, max_length=32)
    role_set_version: str = Field(default="tr-propbank", nullable=False, max_length=64)
    validation_rule_version: str = Field(default="v1", nullable=False, max_length=64)
    version_tag: str = Field(default="v1", nullable=False, max_length=64)
    description: Optional[str] = Field(default=None, max_length=500)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(
        default_factory=datetime.utcnow, nullable=False, sa_column_kwargs={"onupdate": datetime.utcnow}
    )
