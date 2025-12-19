from datetime import datetime
from typing import Optional

from sqlalchemy import JSON, Column
from sqlmodel import Field, SQLModel


class Adjudication(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    sentence_id: int = Field(foreign_key="sentence.id", nullable=False, index=True)
    curator_id: int = Field(nullable=False, index=True)
    final_penman: str = Field(nullable=False)
    decision_note: Optional[str] = Field(default=None, max_length=500)
    source_annotation_ids: Optional[list[int]] = Field(default=None, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
