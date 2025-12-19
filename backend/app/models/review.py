from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel

from ..enums import ReviewDecision


class Review(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    annotation_id: int = Field(foreign_key="annotation.id", nullable=False, index=True)
    reviewer_id: int = Field(nullable=False, index=True)
    decision: ReviewDecision = Field(nullable=False)
    score: Optional[float] = Field(default=None)
    comment: Optional[str] = Field(default=None, max_length=500)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
