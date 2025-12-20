from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from ..database import get_session
from ..dependencies import CurrentUser, get_current_user
from ..enums import AssignmentStrategy, ReviewDecision, Role, SentenceStatus
from ..models import Adjudication, Annotation, Assignment, FailedSubmission, Project, Review, Sentence
from ..schemas import (
    AdjudicationSubmit,
    AnnotationSubmit,
    AssignmentRequest,
    ReopenRequest,
    ReviewSubmit,
    SentenceCreate,
)
from ..services.assignment_engine import AssignmentEngine
from ..services.audit import log_action
from ..services.validation import ValidationService
from ..services.workflow import WorkflowGuard, require_roles

router = APIRouter(prefix="/sentences", tags=["sentences"])


def _get_project(session: Session, project_id: int) -> Project:
    project = session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Proje bulunamadı")
    return project


def _get_sentence(session: Session, sentence_id: int) -> Sentence:
    sentence = session.get(Sentence, sentence_id)
    if not sentence:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cümle bulunamadı")
    return sentence


def _record_failed_submission(
    session: Session,
    *,
    project: Project,
    sentence: Sentence,
    failure_type: str,
    reason: str,
    details: dict[str, Any],
    assignment_id: Optional[int] = None,
    annotation_id: Optional[int] = None,
    user_id: Optional[int] = None,
    reviewer_id: Optional[int] = None,
    penman_text: Optional[str] = None,
) -> FailedSubmission:
    failure = FailedSubmission(
        project_id=project.id,
        sentence_id=sentence.id,
        assignment_id=assignment_id,
        annotation_id=annotation_id,
        user_id=user_id,
        reviewer_id=reviewer_id,
        failure_type=failure_type,
        reason=reason,
        details=details,
        amr_version=project.amr_version,
        role_set_version=project.role_set_version,
        rule_version=project.validation_rule_version,
        submitted_penman=penman_text,
    )
    session.add(failure)
    session.flush()
    return failure


def _deactivate_assignments(
    session: Session,
    sentence_id: int,
    assignment_ids: Optional[set[int]] = None,
) -> list[int]:
    query = select(Assignment).where(Assignment.sentence_id == sentence_id, Assignment.is_active.is_(True))
    if assignment_ids:
        query = query.where(Assignment.id.in_(assignment_ids))
    assignments = session.exec(query).all()
    deactivated_ids: list[int] = []
    for assignment in assignments:
        assignment.is_active = False
        session.add(assignment)
        deactivated_ids.append(assignment.id)
    return deactivated_ids


def _handle_reassign_after_reject(
    session: Session,
    sentence_id: int,
    guard: WorkflowGuard,
) -> tuple[list[int], list[Assignment]]:
    has_rejection = (
        session.exec(
            select(Review.id)
            .join(Annotation, Annotation.id == Review.annotation_id)
            .where(Annotation.sentence_id == sentence_id, Review.decision == ReviewDecision.REJECT)
        ).first()
        is not None
    )
    guard.require_rejection_for_reassignment(has_rejection=has_rejection)
    deactivated_assignments = _deactivate_assignments(session, sentence_id)
    return deactivated_assignments, []


def _resolve_assignments(
    session: Session,
    sentence: Sentence,
    payload: AssignmentRequest,
    active_assignments: list[Assignment],
) -> tuple[list[Assignment], list[int], int]:
    requested_count = payload.count if payload.assignee_ids is None else len(payload.assignee_ids)
    if requested_count < 1:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Atanacak kullanıcı sayısı belirtilmeli.")

    assignment_engine = AssignmentEngine(session)
    existing_assignees = {assignment.user_id for assignment in active_assignments}
    assignee_ids = assignment_engine.select_assignees(
        project_id=sentence.project_id,
        strategy=payload.strategy,
        role=payload.role,
        count=requested_count,
        required_skills=payload.required_skills,
        provided_assignees=payload.assignee_ids,
        exclude_user_ids=existing_assignees,
    )

    assignments: list[Assignment] = []
    for assignee_id in assignee_ids:
        assignment = Assignment(
            sentence_id=sentence.id,
            user_id=assignee_id,
            role=payload.role,
            is_blind=payload.is_blind,
        )
        assignments.append(assignment)
        session.add(assignment)

    return assignments, assignee_ids, requested_count


def _assignment_log_metadata(
    assignments: list[Assignment],
    assignee_ids: list[int],
    payload: AssignmentRequest,
    requested_count: int,
    deactivated_assignment_ids: list[int],
) -> dict[str, Any]:
    return {
        "assignment_ids": [assignment.id for assignment in assignments],
        "assignee_ids": assignee_ids,
        "assignee_role": payload.role.value,
        "strategy": payload.strategy.value if isinstance(payload.strategy, AssignmentStrategy) else payload.strategy,
        "requested_count": requested_count,
        "is_blind": payload.is_blind,
        "required_skills": payload.required_skills,
        "allow_multiple_assignments": payload.allow_multiple_assignments,
        "reassign_after_reject": payload.reassign_after_reject,
        "deactivated_assignment_ids": deactivated_assignment_ids,
    }


def _refresh_assignments(session: Session, assignments: list[Assignment]) -> None:
    for assignment in assignments:
        session.refresh(assignment)


@router.post("/project/{project_id}", response_model=Sentence, status_code=status.HTTP_201_CREATED)
def create_sentence(
    project_id: int,
    payload: SentenceCreate,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
) -> Sentence:
    require_roles(user, {Role.ADMIN, Role.CURATOR}, use_project_roles=True)
    _get_project(session, project_id)
    sentence = Sentence(project_id=project_id, **payload.dict())
    session.add(sentence)
    session.flush()
    log_action(
        session,
        actor_id=user.user_id,
        actor_role=user.acting_role,
        action="sentence_created",
        entity_type="sentence",
        entity_id=sentence.id,
        before_status=None,
        after_status=SentenceStatus.NEW,
        project_id=project_id,
        metadata={"project_id": project_id, "source": payload.source, "difficulty_tag": payload.difficulty_tag},
    )
    session.commit()
    session.refresh(sentence)
    return sentence


@router.post("/{sentence_id}/assign", response_model=list[Assignment])
def assign_sentence(
    sentence_id: int,
    payload: AssignmentRequest,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
) -> list[Assignment]:
    sentence = _get_sentence(session, sentence_id)
    guard = WorkflowGuard()
    before_status = sentence.status
    active_assignments = session.exec(
        select(Assignment).where(Assignment.sentence_id == sentence_id, Assignment.is_active.is_(True))
    ).all()
    guard.ensure_assignment_allowed(
        status=sentence.status,
        has_active_assignments=bool(active_assignments),
        allow_multiple_assignments=payload.allow_multiple_assignments,
        allow_reassignment=payload.reassign_after_reject,
    )

    deactivated_assignments: list[int] = []
    if payload.reassign_after_reject:
        deactivated_assignments, active_assignments = _handle_reassign_after_reject(session, sentence_id, guard)

    guard.ensure_transition(sentence.status, SentenceStatus.ASSIGNED, user.acting_role)
    assignments, assignee_ids, requested_count = _resolve_assignments(
        session=session,
        sentence=sentence,
        payload=payload,
        active_assignments=active_assignments,
    )

    sentence.status = SentenceStatus.ASSIGNED
    session.add(sentence)
    session.flush()
    metadata = _assignment_log_metadata(
        assignments=assignments,
        assignee_ids=assignee_ids,
        payload=payload,
        requested_count=requested_count,
        deactivated_assignment_ids=deactivated_assignments,
    )
    log_action(
        session,
        actor_id=user.user_id,
        actor_role=user.acting_role,
        action="sentence_assigned",
        entity_type="sentence",
        entity_id=sentence.id,
        before_status=before_status,
        after_status=SentenceStatus.ASSIGNED,
        project_id=sentence.project_id,
        metadata=metadata,
    )
    session.commit()
    _refresh_assignments(session, assignments)
    return assignments


@router.post("/{sentence_id}/submit", response_model=Annotation, status_code=status.HTTP_201_CREATED)
def submit_annotation(
    sentence_id: int,
    payload: AnnotationSubmit,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
) -> Annotation:
    sentence = _get_sentence(session, sentence_id)
    project = _get_project(session, sentence.project_id)
    assignment = session.exec(
        select(Assignment).where(
            Assignment.sentence_id == sentence_id,
            Assignment.user_id == user.user_id,
            Assignment.is_active.is_(True),
        )
    ).first()
    if not assignment:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Atama bulunamadı")

    guard = WorkflowGuard()
    before_status = sentence.status
    guard.ensure_transition(sentence.status, SentenceStatus.SUBMITTED, user.acting_role)

    validator = ValidationService(
        amr_version=project.amr_version,
        role_set_version=project.role_set_version,
        rule_version=project.validation_rule_version,
    )
    report = validator.validate(payload.penman_text)
    report_json = report.to_json()

    if not report.is_valid:
        _record_failed_submission(
            session,
            project=project,
            sentence=sentence,
            failure_type="validation",
            reason="Validasyon başarısız.",
            details=report.to_dict(),
            assignment_id=assignment.id,
            user_id=user.user_id,
            penman_text=payload.penman_text,
        )
        session.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "Validasyon hatası", "errors": report.to_dict().get("errors", [])},
        )

    annotation = Annotation(
        sentence_id=sentence_id,
        assignment_id=assignment.id,
        author_id=user.user_id,
        penman_text=report.canonical_penman or payload.penman_text,
        validity_report=report_json,
    )
    sentence.status = SentenceStatus.SUBMITTED
    session.add(annotation)
    session.add(sentence)
    session.flush()
    log_action(
        session,
        actor_id=user.user_id,
        actor_role=user.acting_role,
        action="annotation_submitted",
        entity_type="sentence",
        entity_id=sentence.id,
        before_status=before_status,
        after_status=SentenceStatus.SUBMITTED,
        project_id=sentence.project_id,
        metadata={"annotation_id": annotation.id, "assignment_id": assignment.id},
    )
    session.commit()
    session.refresh(annotation)
    return annotation


@router.post("/{sentence_id}/review", response_model=Sentence)
def review_annotation(
    sentence_id: int,
    payload: ReviewSubmit,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
) -> Sentence:
    sentence = _get_sentence(session, sentence_id)
    project = _get_project(session, sentence.project_id)
    guard = WorkflowGuard(is_multi_annotator=payload.is_multi_annotator)
    before_status = sentence.status

    target_status = guard.review_to_target(payload.decision)

    if sentence.status == SentenceStatus.SUBMITTED:
        guard.ensure_transition(sentence.status, SentenceStatus.IN_REVIEW, user.acting_role)
        sentence.status = SentenceStatus.IN_REVIEW

    if sentence.status != target_status:
        guard.ensure_transition(sentence.status, target_status, user.acting_role)

    annotation = session.get(Annotation, payload.annotation_id)
    if not annotation or annotation.sentence_id != sentence_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Geçersiz anotasyon")

    deactivated_assignment_ids: set[int] = set()
    if guard.should_close_assignment_for_review(payload.decision):
        deactivated_assignment_ids.update(
            _deactivate_assignments(session, sentence_id, {annotation.assignment_id})
        )
    if guard.should_lock_assignments_for_target(target_status):
        deactivated_assignment_ids.update(_deactivate_assignments(session, sentence_id))

    review = Review(
        annotation_id=payload.annotation_id,
        reviewer_id=user.user_id,
        decision=payload.decision,
        score=payload.score,
        comment=payload.comment,
    )

    sentence.status = target_status
    session.add(review)
    session.add(sentence)
    session.flush()
    if payload.decision == ReviewDecision.REJECT:
        _record_failed_submission(
            session,
            project=project,
            sentence=sentence,
            failure_type="review_reject",
            reason=payload.comment or "Reviewer tarafından reddedildi.",
            details={
                "review_id": review.id,
                "annotation_id": payload.annotation_id,
                "decision": payload.decision.value,
                "score": payload.score,
            },
            annotation_id=annotation.id,
            assignment_id=annotation.assignment_id,
            user_id=annotation.author_id,
            reviewer_id=user.user_id,
            penman_text=annotation.penman_text,
        )
    log_action(
        session,
        actor_id=user.user_id,
        actor_role=user.acting_role,
        action="review_recorded",
        entity_type="sentence",
        entity_id=sentence.id,
        before_status=before_status,
        after_status=sentence.status,
        project_id=sentence.project_id,
        metadata={
            "review_id": review.id,
            "annotation_id": payload.annotation_id,
            "decision": payload.decision.value,
            "score": payload.score,
            "is_multi_annotator": payload.is_multi_annotator,
            "deactivated_assignment_ids": sorted(deactivated_assignment_ids),
        },
    )
    session.commit()
    session.refresh(sentence)
    return sentence


@router.post("/{sentence_id}/adjudicate", response_model=Adjudication, status_code=status.HTTP_201_CREATED)
def adjudicate_sentence(
    sentence_id: int,
    payload: AdjudicationSubmit,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
) -> Adjudication:
    sentence = _get_sentence(session, sentence_id)
    require_roles(user, {Role.ADMIN, Role.CURATOR}, use_project_roles=True)
    before_status = sentence.status
    if sentence.status != SentenceStatus.IN_REVIEW:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cümle curation/review aşamasında değil.",
        )
    guard = WorkflowGuard()
    guard.ensure_transition(sentence.status, SentenceStatus.ADJUDICATED, user.acting_role)

    adjudication = Adjudication(
        sentence_id=sentence_id,
        curator_id=user.user_id,
        final_penman=payload.final_penman,
        decision_note=payload.decision_note,
        source_annotation_ids=payload.source_annotation_ids,
    )
    deactivated_assignment_ids = _deactivate_assignments(session, sentence_id)
    sentence.status = SentenceStatus.ADJUDICATED
    session.add(adjudication)
    session.add(sentence)
    session.flush()
    log_action(
        session,
        actor_id=user.user_id,
        actor_role=user.acting_role,
        action="adjudication_completed",
        entity_type="sentence",
        entity_id=sentence.id,
        before_status=before_status,
        after_status=SentenceStatus.ADJUDICATED,
        project_id=sentence.project_id,
        metadata={
            "adjudication_id": adjudication.id,
            "decision_note": payload.decision_note,
            "source_annotation_ids": payload.source_annotation_ids,
            "deactivated_assignment_ids": deactivated_assignment_ids,
        },
    )
    session.commit()
    session.refresh(adjudication)
    return adjudication


@router.post("/{sentence_id}/accept", response_model=Sentence)
def accept_sentence(
    sentence_id: int,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
) -> Sentence:
    sentence = _get_sentence(session, sentence_id)
    require_roles(user, {Role.ADMIN, Role.CURATOR}, use_project_roles=True)
    guard = WorkflowGuard()
    guard.ensure_transition(sentence.status, SentenceStatus.ACCEPTED, user.acting_role)
    before_status = sentence.status
    deactivated_assignment_ids = _deactivate_assignments(session, sentence_id)
    sentence.status = SentenceStatus.ACCEPTED
    session.add(sentence)
    log_action(
        session,
        actor_id=user.user_id,
        actor_role=user.acting_role,
        action="sentence_accepted",
        entity_type="sentence",
        entity_id=sentence.id,
        before_status=before_status,
        after_status=SentenceStatus.ACCEPTED,
        project_id=sentence.project_id,
        metadata={"deactivated_assignment_ids": deactivated_assignment_ids},
    )
    session.commit()
    session.refresh(sentence)
    return sentence


@router.post("/{sentence_id}/reopen", response_model=Sentence)
def reopen_adjudication(
    sentence_id: int,
    payload: ReopenRequest,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
) -> Sentence:
    sentence = _get_sentence(session, sentence_id)
    require_roles(user, {Role.ADMIN, Role.CURATOR}, use_project_roles=True)
    if sentence.status != SentenceStatus.ADJUDICATED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Yalnızca adjudication sonrası cümleler yeniden açılabilir.",
        )
    guard = WorkflowGuard()
    guard.ensure_transition(sentence.status, SentenceStatus.IN_REVIEW, user.acting_role)
    before_status = sentence.status
    sentence.status = SentenceStatus.IN_REVIEW
    session.add(sentence)
    log_action(
        session,
        actor_id=user.user_id,
        actor_role=user.acting_role,
        action="adjudication_reopened",
        entity_type="sentence",
        entity_id=sentence.id,
        before_status=before_status,
        after_status=SentenceStatus.IN_REVIEW,
        project_id=sentence.project_id,
        metadata={"reason": payload.reason},
    )
    session.commit()
    session.refresh(sentence)
    return sentence


@router.get("/project/{project_id}", response_model=list[Sentence])
def list_sentences(
    project_id: int, session: Session = Depends(get_session), user: CurrentUser = Depends(get_current_user)
) -> list[Sentence]:
    _get_project(session, project_id)
    require_roles(user, {Role.ADMIN, Role.CURATOR, Role.REVIEWER, Role.ANNOTATOR}, use_project_roles=True)
    return list(session.exec(select(Sentence).where(Sentence.project_id == project_id)))
