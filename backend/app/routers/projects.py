from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlmodel import Session, select

from ..database import get_session
from ..enums import Role, SentenceStatus
from ..dependencies import admin_user, CurrentUser, get_current_user
from ..models import Adjudication, Annotation, Assignment, Project, ProjectMembership, Review, Sentence, User
from ..schemas import (
    ProjectCreate,
    ProjectMembershipPublic,
    ProjectMembershipRequest,
    ProjectMembershipUpdate,
    ProjectSummary,
)
from ..services.audit import log_action
from ..services.workflow import require_roles

router = APIRouter(prefix="/projects", tags=["projects"])


def _membership_to_public(membership: ProjectMembership) -> ProjectMembershipPublic:
    return ProjectMembershipPublic(
        user_id=membership.user_id,
        project_id=membership.project_id,
        role=membership.role,
        is_active=membership.is_active,
        approved_at=membership.approved_at,
    )


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
    require_roles(user, {Role.ADMIN, Role.CURATOR}, use_project_roles=True)

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


@router.get("/{project_id}/members", response_model=list[ProjectMembershipPublic])
def list_project_members(
    project_id: int, session: Session = Depends(get_session), user: CurrentUser = Depends(get_current_user)
) -> list[ProjectMembershipPublic]:
    project = session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Proje bulunamadı")
    require_roles(user, {Role.ADMIN, Role.CURATOR}, use_project_roles=True)
    memberships = session.exec(select(ProjectMembership).where(ProjectMembership.project_id == project_id)).all()
    return [_membership_to_public(membership) for membership in memberships]


@router.post(
    "/{project_id}/members",
    response_model=ProjectMembershipPublic,
    status_code=status.HTTP_201_CREATED,
)
def add_project_member(
    project_id: int,
    payload: ProjectMembershipRequest,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
) -> ProjectMembershipPublic:
    project = session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Proje bulunamadı")
    acting_role = require_roles(user, {Role.ADMIN, Role.CURATOR}, use_project_roles=True)

    target_user = session.get(User, payload.user_id)
    if not target_user or not target_user.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hedef kullanıcı bulunamadı veya pasif")

    existing = session.exec(
        select(ProjectMembership).where(
            ProjectMembership.project_id == project_id, ProjectMembership.user_id == payload.user_id
        )
    ).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Üye zaten mevcut")

    membership = ProjectMembership(
        project_id=project_id, user_id=payload.user_id, role=payload.role, is_active=False, approved_at=None
    )
    session.add(membership)
    session.flush()
    log_action(
        session,
        actor_id=user.user_id,
        actor_role=acting_role,
        action="project_member_added",
        entity_type="project_membership",
        entity_id=membership.id,
        before_status=None,
        after_status="pending",
        project_id=project_id,
        metadata={"role": payload.role.value, "target_user_id": payload.user_id},
    )
    session.commit()
    session.refresh(membership)
    return _membership_to_public(membership)


@router.post("/{project_id}/members/{member_user_id}/approve", response_model=ProjectMembershipPublic)
def approve_project_member(
    project_id: int,
    member_user_id: int,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
) -> ProjectMembershipPublic:
    project = session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Proje bulunamadı")

    acting_role = require_roles(user, {Role.ADMIN, Role.CURATOR}, use_project_roles=True)

    target_user = session.get(User, member_user_id)
    if not target_user or not target_user.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hedef kullanıcı bulunamadı veya pasif")

    membership = session.exec(
        select(ProjectMembership).where(
            ProjectMembership.project_id == project_id, ProjectMembership.user_id == member_user_id
        )
    ).first()
    if not membership:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Üye bulunamadı")
    if membership.approved_at is not None and membership.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Üyelik zaten aktif")

    before_status = "pending" if membership.approved_at is None else "inactive"
    membership.is_active = True
    membership.approved_at = datetime.utcnow()
    session.add(membership)
    log_action(
        session,
        actor_id=user.user_id,
        actor_role=acting_role,
        action="project_member_approved",
        entity_type="project_membership",
        entity_id=membership.id,
        before_status=before_status,
        after_status="active",
        project_id=project_id,
        metadata={"role": membership.role.value, "target_user_id": member_user_id},
    )
    session.commit()
    session.refresh(membership)
    return _membership_to_public(membership)


@router.patch("/{project_id}/members/{member_user_id}", response_model=ProjectMembershipPublic)
def update_project_member(
    project_id: int,
    member_user_id: int,
    payload: ProjectMembershipUpdate,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
) -> ProjectMembershipPublic:
    project = session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Proje bulunamadı")

    acting_role = require_roles(user, {Role.ADMIN, Role.CURATOR}, use_project_roles=True)

    target_user = session.get(User, member_user_id)
    if not target_user or not target_user.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hedef kullanıcı bulunamadı veya pasif")

    membership = session.exec(
        select(ProjectMembership).where(
            ProjectMembership.project_id == project_id, ProjectMembership.user_id == member_user_id
        )
    ).first()
    if not membership:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Üyelik bulunamadı")

    changes_applied = False

    if payload.role and payload.role != membership.role:
        before_role = membership.role
        membership.role = payload.role
        log_action(
            session,
            actor_id=user.user_id,
            actor_role=acting_role,
            action="project_member_role_changed",
            entity_type="project_membership",
            entity_id=membership.id,
            before_status=before_role.value,
            after_status=membership.role.value,
            project_id=project_id,
            metadata={"target_user_id": member_user_id},
        )
        changes_applied = True

    if payload.is_active is not None and payload.is_active != membership.is_active:
        before_status = "active" if membership.is_active else "inactive"
        membership.is_active = payload.is_active
        if payload.is_active and membership.approved_at is None:
            membership.approved_at = datetime.utcnow()
        log_action(
            session,
            actor_id=user.user_id,
            actor_role=acting_role,
            action="project_member_status_changed",
            entity_type="project_membership",
            entity_id=membership.id,
            before_status=before_status,
            after_status="active" if membership.is_active else "inactive",
            project_id=project_id,
            metadata={"target_user_id": member_user_id},
        )
        changes_applied = True

    if not changes_applied:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Güncellenecek değişiklik yok")

    session.add(membership)
    session.commit()
    session.refresh(membership)
    return _membership_to_public(membership)
