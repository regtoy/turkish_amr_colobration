from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel

from ..enums import SentenceStatus


class Sentence(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    project_id: int = Field(foreign_key="project.id", nullable=False, index=True)
    text: str = Field(nullable=False)
    source: Optional[str] = Field(default=None, max_length=128)
    difficulty_tag: Optional[str] = Field(default=None, max_length=64)
    status: SentenceStatus = Field(default=SentenceStatus.NEW, nullable=False, index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
