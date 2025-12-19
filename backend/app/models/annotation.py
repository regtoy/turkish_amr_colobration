from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel


class Annotation(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    sentence_id: int = Field(foreign_key="sentence.id", nullable=False, index=True)
    assignment_id: Optional[int] = Field(default=None, foreign_key="assignment.id")
    author_id: int = Field(nullable=False, index=True)
    penman_text: str = Field(nullable=False)
    validity_report: Optional[str] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
