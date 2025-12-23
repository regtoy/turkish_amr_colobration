from __future__ import annotations

from pathlib import Path

from sqlmodel import Session, select

from ..enums import JobStatus, Role
from ..models import ExportJob
from .export import ExportRequest, ExportService, ExportValidationError
from .job_queue import ExportJobQueue


class ExportWorker:
    """Simple synchronous worker to process queued export jobs."""

    def __init__(self, session: Session, *, output_dir: str | Path = "exported") -> None:
        self.session = session
        self.output_dir = Path(output_dir)
        self.queue = ExportJobQueue(session)
        self.service = ExportService(session)

    def _to_request(self, job: ExportJob) -> ExportRequest:
        return ExportRequest(
            project_id=job.project_id,
            level=job.level,
            format=job.format,
            pii_strategy=job.pii_strategy,
            include_manifest=job.include_manifest,
            include_failed=job.include_failed,
            include_rejected=job.include_rejected,
        )

    def run_next(self) -> ExportJob | None:
        job = self.session.exec(
            select(ExportJob).where(ExportJob.status == JobStatus.QUEUED).order_by(ExportJob.created_at)
        ).first()
        if not job:
            return None
        return self.run_job(job)

    def run_job(self, job: ExportJob) -> ExportJob:
        self.queue.mark_running(job)
        request = self._to_request(job)
        try:
            payload = self.service.export(request, actor_role=Role.ADMIN)
            path = self.service.write_export_file(payload, request, directory=self.output_dir, job_id=job.id)
        except (ExportValidationError, Exception) as exc:  # noqa: BLE001
            return self.queue.mark_failed(job, error_message=str(exc))

        return self.queue.mark_completed(job, result_path=path)

