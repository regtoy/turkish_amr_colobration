from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel

from ..enums import Role


class Assignment(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    sentence_id: int = Field(foreign_key="sentence.id", nullable=False, index=True)
    user_id: int = Field(nullable=False, index=True)
    role: Role = Field(default=Role.ANNOTATOR, nullable=False)
    is_blind: bool = Field(default=False, nullable=False)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(
        default_factory=datetime.utcnow, nullable=False, sa_column_kwargs={"onupdate": datetime.utcnow}
    )
