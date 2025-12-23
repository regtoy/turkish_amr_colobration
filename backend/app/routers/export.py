from __future__ import annotations

from fastapi import APIRouter, Depends, Header, HTTPException, Response, status
from fastapi.responses import FileResponse
from pathlib import Path
from sqlmodel import Session

from ..database import get_session
from ..dependencies import CurrentUser, get_current_user
from ..enums import ExportLevel, ExportFormat, PiiStrategy, Role, JobStatus
from ..models import ExportJob, Project
from ..schemas import ExportJobCreate, ExportJobPublic, ExportRequestParams
from ..services.export import ExportRequest, ExportService, ExportAccessError, ExportNotFoundError
from ..services.job_queue import ExportJobQueue
from ..services.workflow import require_roles

router = APIRouter(prefix="/exports", tags=["exports"])


def _ensure_project(session: Session, project_id: int) -> Project:
    project = session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Proje bulunamadı")
    return project


def _job_to_public(job: ExportJob) -> ExportJobPublic:
    return ExportJobPublic(
        id=job.id,
        project_id=job.project_id,
        created_by=job.created_by,
        status=job.status,
        format=job.format,
        level=job.level,
        pii_strategy=job.pii_strategy,
        include_manifest=job.include_manifest,
        include_failed=job.include_failed,
        include_rejected=job.include_rejected,
        result_path=job.result_path,
        error_message=job.error_message,
        created_at=job.created_at,
        updated_at=job.updated_at,
    )


@router.get("/project/{project_id}", status_code=status.HTTP_200_OK)
def download_export(
    project_id: int,
    response: Response,
    params: ExportRequestParams = Depends(),
    include_manifest: bool = True,
    include_failed: bool = False,
    include_rejected: bool = False,
    x_request_id: str | None = Header(default=None, alias="X-Request-Id"),
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
) -> dict:
    require_roles(user, {Role.ADMIN, Role.CURATOR}, use_project_roles=True)
    project = _ensure_project(session, project_id)

    request = ExportRequest(
        project_id=project_id,
        level=params.level,
        format=params.format,
        pii_strategy=params.pii_strategy,
        include_manifest=include_manifest,
        include_failed=include_failed,
        include_rejected=include_rejected,
    )
    service = ExportService(session)
    try:
        payload = service.export(request, actor_role=user.acting_role)
    except ExportAccessError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except ExportNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    if response is not None:
        response.headers["X-Project-AMR-Version"] = project.amr_version
        response.headers["X-Project-Role-Set-Version"] = project.role_set_version
        response.headers["X-Project-Validation-Rule-Version"] = project.validation_rule_version
        response.headers["X-Project-Version-Tag"] = project.version_tag
        if x_request_id:
            response.headers["X-Request-Id"] = x_request_id
    # FastAPI will serialize payload when returning dict
    return payload


@router.post("/project/{project_id}/jobs", response_model=ExportJobPublic, status_code=status.HTTP_201_CREATED)
def create_export_job(
    project_id: int,
    payload: ExportJobCreate,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
) -> ExportJobPublic:
    require_roles(user, {Role.ADMIN, Role.CURATOR}, use_project_roles=True)
    _ensure_project(session, project_id)
    queue = ExportJobQueue(session)
    job = queue.enqueue(
        project_id=project_id,
        created_by=user.user_id,
        level=payload.level,
        format=payload.format,
        pii_strategy=payload.pii_strategy,
        include_manifest=payload.include_manifest,
        include_failed=payload.include_failed,
        include_rejected=payload.include_rejected,
        filters=None,
    )
    return _job_to_public(job)


@router.get("/jobs/{job_id}", response_model=ExportJobPublic)
def get_export_job(
    job_id: int,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
) -> ExportJobPublic:
    require_roles(user, {Role.ADMIN, Role.CURATOR}, use_project_roles=True)
    job = session.get(ExportJob, job_id)
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Export job bulunamadı")
    return _job_to_public(job)


@router.get("/jobs/{job_id}/download")
def download_export_job_result(
    job_id: int,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
):
    require_roles(user, {Role.ADMIN, Role.CURATOR}, use_project_roles=True)
    job = session.get(ExportJob, job_id)
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Export job bulunamadı")
    if job.status != JobStatus.COMPLETED or not job.result_path:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Job tamamlanmadı veya indirme yolu hazır değil"
        )

    path = Path(job.result_path)
    if not path.exists() or not path.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Export dosyası bulunamadı")
    return FileResponse(path, filename=path.name, media_type="application/octet-stream")
