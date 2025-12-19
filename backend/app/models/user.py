from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel

from ..enums import Role


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(index=True, nullable=False, max_length=64)
    email: Optional[str] = Field(default=None, index=True, max_length=255)
    role: Role = Field(default=Role.PENDING, nullable=False)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    is_active: bool = Field(default=True, nullable=False)
