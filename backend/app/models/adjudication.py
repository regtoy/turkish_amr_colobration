from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel


class Adjudication(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    sentence_id: int = Field(foreign_key="sentence.id", nullable=False, index=True)
    curator_id: int = Field(nullable=False, index=True)
    final_penman: str = Field(nullable=False)
    decision_note: Optional[str] = Field(default=None, max_length=500)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
