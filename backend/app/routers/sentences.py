from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from ..database import get_session
from ..dependencies import CurrentUser, get_current_user
from ..enums import Role, SentenceStatus
from ..models import Adjudication, Annotation, Assignment, Project, Review, Sentence
from ..schemas import (
    AdjudicationSubmit,
    AnnotationSubmit,
    AssignmentRequest,
    ReopenRequest,
    ReviewSubmit,
    SentenceCreate,
)
from ..services.audit import log_action
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


@router.post("/project/{project_id}", response_model=Sentence, status_code=status.HTTP_201_CREATED)
def create_sentence(
    project_id: int,
    payload: SentenceCreate,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
) -> Sentence:
    require_roles(user.role, {Role.ADMIN})
    _get_project(session, project_id)
    sentence = Sentence(project_id=project_id, **payload.dict())
    session.add(sentence)
    session.flush()
    log_action(
        session,
        actor_id=user.user_id,
        actor_role=user.role,
        action="sentence_created",
        entity_type="sentence",
        entity_id=sentence.id,
        before_status=None,
        after_status=SentenceStatus.NEW,
        metadata={"project_id": project_id, "source": payload.source, "difficulty_tag": payload.difficulty_tag},
    )
    session.commit()
    session.refresh(sentence)
    return sentence


@router.post("/{sentence_id}/assign", response_model=Assignment)
def assign_sentence(
    sentence_id: int,
    payload: AssignmentRequest,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
) -> Assignment:
    sentence = _get_sentence(session, sentence_id)
    guard = WorkflowGuard()
    before_status = sentence.status
    guard.ensure_transition(sentence.status, SentenceStatus.ASSIGNED, user.role)
    assignment = Assignment(sentence_id=sentence_id, **payload.dict())
    sentence.status = SentenceStatus.ASSIGNED
    session.add(assignment)
    session.add(sentence)
    session.flush()
    log_action(
        session,
        actor_id=user.user_id,
        actor_role=user.role,
        action="sentence_assigned",
        entity_type="sentence",
        entity_id=sentence.id,
        before_status=before_status,
        after_status=SentenceStatus.ASSIGNED,
        metadata={"assignment_id": assignment.id, "assignee_role": payload.role.value, "is_blind": payload.is_blind},
    )
    session.commit()
    session.refresh(assignment)
    return assignment


@router.post("/{sentence_id}/submit", response_model=Annotation, status_code=status.HTTP_201_CREATED)
def submit_annotation(
    sentence_id: int,
    payload: AnnotationSubmit,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
) -> Annotation:
    sentence = _get_sentence(session, sentence_id)
    assignment = session.exec(
        select(Assignment).where(
            Assignment.sentence_id == sentence_id, Assignment.user_id == user.user_id
        )
    ).first()
    if not assignment:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Atama bulunamadı")

    guard = WorkflowGuard()
    before_status = sentence.status
    guard.ensure_transition(sentence.status, SentenceStatus.SUBMITTED, user.role)
    annotation = Annotation(
        sentence_id=sentence_id,
        assignment_id=assignment.id,
        author_id=user.user_id,
        penman_text=payload.penman_text,
        validity_report=payload.validity_report,
    )
    sentence.status = SentenceStatus.SUBMITTED
    session.add(annotation)
    session.add(sentence)
    session.flush()
    log_action(
        session,
        actor_id=user.user_id,
        actor_role=user.role,
        action="annotation_submitted",
        entity_type="sentence",
        entity_id=sentence.id,
        before_status=before_status,
        after_status=SentenceStatus.SUBMITTED,
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
    guard = WorkflowGuard(is_multi_annotator=payload.is_multi_annotator)
    before_status = sentence.status

    target_status = guard.review_to_target(payload.decision)

    if sentence.status == SentenceStatus.SUBMITTED:
        guard.ensure_transition(sentence.status, SentenceStatus.IN_REVIEW, user.role)
        sentence.status = SentenceStatus.IN_REVIEW

    if sentence.status != target_status:
        guard.ensure_transition(sentence.status, target_status, user.role)

    annotation = session.get(Annotation, payload.annotation_id)
    if not annotation or annotation.sentence_id != sentence_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Geçersiz anotasyon")

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
    log_action(
        session,
        actor_id=user.user_id,
        actor_role=user.role,
        action="review_recorded",
        entity_type="sentence",
        entity_id=sentence.id,
        before_status=before_status,
        after_status=sentence.status,
        metadata={
            "review_id": review.id,
            "annotation_id": payload.annotation_id,
            "decision": payload.decision.value,
            "score": payload.score,
            "is_multi_annotator": payload.is_multi_annotator,
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
    require_roles(user.role, {Role.ADMIN, Role.CURATOR})
    if sentence.status != SentenceStatus.IN_REVIEW:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cümle curation/review aşamasında değil.",
        )
    guard = WorkflowGuard()
    guard.ensure_transition(sentence.status, SentenceStatus.ADJUDICATED, user.role)

    adjudication = Adjudication(
        sentence_id=sentence_id,
        curator_id=user.user_id,
        final_penman=payload.final_penman,
        decision_note=payload.decision_note,
        source_annotation_ids=payload.source_annotation_ids,
    )
    sentence.status = SentenceStatus.ADJUDICATED
    session.add(adjudication)
    session.add(sentence)
    session.flush()
    log_action(
        session,
        actor_id=user.user_id,
        actor_role=user.role,
        action="adjudication_completed",
        entity_type="sentence",
        entity_id=sentence.id,
        before_status=SentenceStatus.IN_REVIEW,
        after_status=SentenceStatus.ADJUDICATED,
        metadata={
            "adjudication_id": adjudication.id,
            "decision_note": payload.decision_note,
            "source_annotation_ids": payload.source_annotation_ids,
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
    require_roles(user.role, {Role.ADMIN, Role.CURATOR})
    guard = WorkflowGuard()
    guard.ensure_transition(sentence.status, SentenceStatus.ACCEPTED, user.role)
    before_status = sentence.status
    sentence.status = SentenceStatus.ACCEPTED
    session.add(sentence)
    log_action(
        session,
        actor_id=user.user_id,
        actor_role=user.role,
        action="sentence_accepted",
        entity_type="sentence",
        entity_id=sentence.id,
        before_status=before_status,
        after_status=SentenceStatus.ACCEPTED,
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
    require_roles(user.role, {Role.ADMIN, Role.CURATOR})
    guard = WorkflowGuard()
    guard.ensure_transition(sentence.status, SentenceStatus.IN_REVIEW, user.role)
    before_status = sentence.status
    sentence.status = SentenceStatus.IN_REVIEW
    session.add(sentence)
    log_action(
        session,
        actor_id=user.user_id,
        actor_role=user.role,
        action="adjudication_reopened",
        entity_type="sentence",
        entity_id=sentence.id,
        before_status=before_status,
        after_status=SentenceStatus.IN_REVIEW,
        metadata={"reason": payload.reason},
    )
    session.commit()
    session.refresh(sentence)
    return sentence


@router.get("/project/{project_id}", response_model=list[Sentence])
def list_sentences(project_id: int, session: Session = Depends(get_session)) -> list[Sentence]:
    _get_project(session, project_id)
    return list(session.exec(select(Sentence).where(Sentence.project_id == project_id)))
