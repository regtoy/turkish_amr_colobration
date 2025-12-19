from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlmodel import Session, select

from ..database import get_session
from ..enums import Role, SentenceStatus
from ..dependencies import admin_user, CurrentUser, get_current_user
from ..models import Adjudication, Annotation, Assignment, Project, Review, Sentence
from ..schemas import ProjectCreate, ProjectSummary
from ..services.workflow import require_roles

router = APIRouter(prefix="/projects", tags=["projects"])


@router.post("", response_model=Project, status_code=status.HTTP_201_CREATED)
def create_project(
    payload: ProjectCreate,
    session: Session = Depends(get_session),
    _: CurrentUser = Depends(admin_user),
) -> Project:
    existing = session.exec(select(Project).where(Project.name == payload.name)).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Proje adı kullanılıyor")
    project = Project(**payload.dict())
    session.add(project)
    session.commit()
    session.refresh(project)
    return project


@router.get("", response_model=list[Project])
def list_projects(session: Session = Depends(get_session)) -> list[Project]:
    return list(session.exec(select(Project)))


@router.get("/{project_id}/summary", response_model=ProjectSummary)
def project_summary(
    project_id: int,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
) -> ProjectSummary:
    project = session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Proje bulunamadı")
    require_roles(user.role, {Role.ADMIN, Role.CURATOR})

    status_counts: dict[str, int] = {status.value: 0 for status in SentenceStatus}
    rows = session.exec(
        select(Sentence.status, func.count())
        .where(Sentence.project_id == project_id)
        .group_by(Sentence.status)
    ).all()
    for status, count in rows:
        status_counts[status.value] = count

    assignment_counts: dict[str, int] = {role.value: 0 for role in Role}
    assignment_rows = session.exec(
        select(Assignment.role, func.count())
        .join(Sentence, Sentence.id == Assignment.sentence_id)
        .where(Sentence.project_id == project_id)
        .group_by(Assignment.role)
    ).all()
    for role, count in assignment_rows:
        assignment_counts[role.value] = count

    annotation_count_subq = (
        select(func.count(Annotation.id))
        .join(Sentence, Sentence.id == Annotation.sentence_id)
        .where(Sentence.project_id == project_id)
    ).scalar_subquery()
    review_count_subq = (
        select(func.count(Review.id))
        .join(Annotation, Annotation.id == Review.annotation_id)
        .join(Sentence, Sentence.id == Annotation.sentence_id)
        .where(Sentence.project_id == project_id)
    ).scalar_subquery()
    adjudication_count_subq = (
        select(func.count(Adjudication.id))
        .join(Sentence, Sentence.id == Adjudication.sentence_id)
        .where(Sentence.project_id == project_id)
    ).scalar_subquery()
    aggregation_row = session.exec(select(annotation_count_subq, review_count_subq, adjudication_count_subq)).one()
    annotation_count, review_count, adjudication_count = aggregation_row

    return ProjectSummary(
        project_id=project_id,
        total_sentences=sum(status_counts.values()),
        statuses=status_counts,
        assignments_by_role=assignment_counts,
        annotations=annotation_count,
        reviews=review_count,
        adjudications=adjudication_count,
    )
