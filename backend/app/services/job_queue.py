from datetime import datetime
from typing import Optional

from sqlmodel import Session

from ..enums import ExportFormat, ExportLevel, JobStatus, PiiStrategy
from ..models import ExportJob


class ExportJobQueue:
    """Lightweight job record manager for future worker integration."""

    def __init__(self, session: Session) -> None:
        self.session = session

    def enqueue(
        self,
        *,
        project_id: int,
        created_by: int,
        level: ExportLevel,
        format: ExportFormat,
        pii_strategy: PiiStrategy,
        filters: Optional[dict[str, str]] = None,
        include_manifest: bool = True,
        include_failed: bool = False,
        include_rejected: bool = False,
    ) -> ExportJob:
        job = ExportJob(
            project_id=project_id,
            created_by=created_by,
            level=level,
            format=format,
            pii_strategy=pii_strategy,
            filters=filters,
            include_manifest=include_manifest,
            include_failed=include_failed,
            include_rejected=include_rejected,
            status=JobStatus.QUEUED,
        )
        self.session.add(job)
        self.session.commit()
        self.session.refresh(job)
        return job

    def mark_running(self, job: ExportJob) -> ExportJob:
        job.status = JobStatus.RUNNING
        job.updated_at = datetime.utcnow()
        self.session.add(job)
        self.session.commit()
        self.session.refresh(job)
        return job

    def mark_completed(self, job: ExportJob, *, result_path: str) -> ExportJob:
        job.status = JobStatus.COMPLETED
        job.result_path = result_path
        job.updated_at = datetime.utcnow()
        self.session.add(job)
        self.session.commit()
        self.session.refresh(job)
        return job

    def mark_failed(self, job: ExportJob, *, error_message: str) -> ExportJob:
        job.status = JobStatus.FAILED
        job.error_message = error_message
        job.updated_at = datetime.utcnow()
        self.session.add(job)
        self.session.commit()
        self.session.refresh(job)
        return job
