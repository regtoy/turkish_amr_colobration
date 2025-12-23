from datetime import datetime
from typing import Optional

from sqlalchemy import JSON, Column
from sqlmodel import Field, SQLModel

from ..enums import ExportFormat, ExportLevel, JobStatus, PiiStrategy


class ExportJob(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    project_id: int = Field(foreign_key="project.id", nullable=False, index=True)
    created_by: int = Field(nullable=False, index=True)
    status: JobStatus = Field(default=JobStatus.QUEUED, nullable=False, index=True)
    format: ExportFormat = Field(default=ExportFormat.JSON, nullable=False)
    level: ExportLevel = Field(default=ExportLevel.ALL, nullable=False)
    pii_strategy: PiiStrategy = Field(default=PiiStrategy.ANONYMIZE, nullable=False)
    filters: Optional[dict[str, str]] = Field(default=None, sa_column=Column(JSON))
    include_manifest: bool = Field(default=True, nullable=False)
    include_failed: bool = Field(default=False, nullable=False)
    include_rejected: bool = Field(default=False, nullable=False)
    result_path: Optional[str] = Field(default=None, max_length=500)
    error_message: Optional[str] = Field(default=None, max_length=500)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(
        default_factory=datetime.utcnow, nullable=False, sa_column_kwargs={"onupdate": datetime.utcnow}
    )
