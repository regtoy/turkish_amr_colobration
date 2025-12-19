from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from ..database import get_session
from ..dependencies import CurrentUser, get_current_user
from ..enums import Role, SentenceStatus
from ..models import Annotation, Assignment, Project, Review, Sentence
from ..schemas import AnnotationSubmit, AssignmentRequest, ReviewSubmit, SentenceCreate
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
    guard.ensure_transition(sentence.status, SentenceStatus.ASSIGNED, user.role)
    assignment = Assignment(sentence_id=sentence_id, **payload.dict())
    sentence.status = SentenceStatus.ASSIGNED
    session.add(assignment)
    session.add(sentence)
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

    if sentence.status == SentenceStatus.SUBMITTED:
        guard.ensure_transition(sentence.status, SentenceStatus.IN_REVIEW, user.role)
        sentence.status = SentenceStatus.IN_REVIEW

    guard.ensure_transition(sentence.status, guard.review_to_target(payload.decision), user.role)

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

    sentence.status = guard.review_to_target(payload.decision)
    session.add(review)
    session.add(sentence)
    session.commit()
    session.refresh(sentence)
    return sentence


@router.get("/project/{project_id}", response_model=list[Sentence])
def list_sentences(project_id: int, session: Session = Depends(get_session)) -> list[Sentence]:
    _get_project(session, project_id)
    return list(session.exec(select(Sentence).where(Sentence.project_id == project_id)))
