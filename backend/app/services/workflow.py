from typing import Iterable, Set

from fastapi import HTTPException, status

from ..enums import ReviewDecision, Role, SentenceStatus


class WorkflowGuard:
    """Encapsulates the sentence status state machine."""

    _transitions: dict[SentenceStatus, dict[SentenceStatus, Set[Role]]] = {
        SentenceStatus.NEW: {SentenceStatus.ASSIGNED: {Role.ADMIN, Role.ASSIGNMENT_ENGINE}},
        SentenceStatus.ASSIGNED: {SentenceStatus.SUBMITTED: {Role.ANNOTATOR}},
        SentenceStatus.SUBMITTED: {SentenceStatus.IN_REVIEW: {Role.ADMIN, Role.REVIEWER}},
        SentenceStatus.IN_REVIEW: {
            SentenceStatus.ADJUDICATED: {Role.REVIEWER, Role.ADMIN, Role.CURATOR},
            SentenceStatus.SUBMITTED: {Role.REVIEWER},
            SentenceStatus.ASSIGNED: {Role.REVIEWER, Role.ADMIN},
        },
        SentenceStatus.ADJUDICATED: {SentenceStatus.ACCEPTED: {Role.ADMIN, Role.CURATOR}},
    }

    def __init__(self, is_multi_annotator: bool = False) -> None:
        self.is_multi_annotator = is_multi_annotator

    def ensure_transition(self, current: SentenceStatus, target: SentenceStatus, actor: Role) -> None:
        allowed_targets = self._transitions.get(current, {})
        allowed_roles = allowed_targets.get(target)
        if not allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"{current} durumundan {target} hedefine geçiş tanımlı değil.",
            )
        if actor not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"{actor} rolü {current}->{target} geçişine izinli değil.",
            )

    def review_to_target(self, decision: ReviewDecision) -> SentenceStatus:
        if decision == ReviewDecision.APPROVE:
            return SentenceStatus.ADJUDICATED if not self.is_multi_annotator else SentenceStatus.IN_REVIEW
        if decision == ReviewDecision.NEEDS_FIX:
            return SentenceStatus.SUBMITTED
        if decision == ReviewDecision.REJECT:
            return SentenceStatus.ASSIGNED
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Geçersiz review kararı")


def require_roles(actor: Role, allowed: Iterable[Role]) -> None:
    if actor not in set(allowed):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"{actor} rolü bu işlem için yetkili değil.",
        )
