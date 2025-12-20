from typing import Iterable, Set

from fastapi import HTTPException, status

from ..dependencies import CurrentUser
from ..enums import ReviewDecision, Role, SentenceStatus


class WorkflowGuard:
    """Encapsulates the sentence status state machine."""

    _transitions: dict[SentenceStatus, dict[SentenceStatus, Set[Role]]] = {
        SentenceStatus.NEW: {SentenceStatus.ASSIGNED: {Role.ADMIN, Role.ASSIGNMENT_ENGINE, Role.CURATOR}},
        SentenceStatus.ASSIGNED: {
            SentenceStatus.ASSIGNED: {Role.ADMIN, Role.ASSIGNMENT_ENGINE, Role.CURATOR},
            SentenceStatus.SUBMITTED: {Role.ANNOTATOR},
        },
        SentenceStatus.SUBMITTED: {SentenceStatus.IN_REVIEW: {Role.ADMIN, Role.REVIEWER, Role.CURATOR}},
        SentenceStatus.IN_REVIEW: {
            SentenceStatus.IN_REVIEW: {Role.REVIEWER, Role.ADMIN, Role.CURATOR},
            SentenceStatus.ADJUDICATED: {Role.REVIEWER, Role.ADMIN, Role.CURATOR},
            SentenceStatus.SUBMITTED: {Role.REVIEWER},
            SentenceStatus.ASSIGNED: {Role.REVIEWER, Role.ADMIN, Role.CURATOR},
        },
        SentenceStatus.ADJUDICATED: {
            SentenceStatus.ACCEPTED: {Role.ADMIN, Role.CURATOR},
            SentenceStatus.IN_REVIEW: {Role.ADMIN, Role.CURATOR},
            SentenceStatus.ADJUDICATED: {Role.ADMIN, Role.CURATOR},
        },
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

    def ensure_assignment_allowed(
        self,
        *,
        status: SentenceStatus,
        has_active_assignments: bool,
        allow_multiple_assignments: bool,
        allow_reassignment: bool,
    ) -> None:
        if status not in {SentenceStatus.NEW, SentenceStatus.ASSIGNED}:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Bu durumdayken yeni atama yapılamaz.",
            )
        if has_active_assignments and not (allow_multiple_assignments or allow_reassignment):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Aktif atamalar varken yeni atama için izin gerekli.",
            )

    @staticmethod
    def require_rejection_for_reassignment(*, has_rejection: bool) -> None:
        if not has_rejection:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Reject kararı olmadan yeniden atama yapılamaz.",
            )

    @staticmethod
    def should_close_assignment_for_review(decision: ReviewDecision) -> bool:
        return decision in {ReviewDecision.APPROVE, ReviewDecision.REJECT}

    @staticmethod
    def should_lock_assignments_for_target(target: SentenceStatus) -> bool:
        return target in {SentenceStatus.IN_REVIEW, SentenceStatus.ADJUDICATED, SentenceStatus.ACCEPTED}


def require_roles(user: CurrentUser, allowed: Iterable[Role], *, use_project_roles: bool = False) -> Role:
    allowed_set = set(allowed)
    if user.role == Role.ADMIN:
        return user.role
    if use_project_roles and user.project_role in allowed_set:
        return user.project_role  # type: ignore[return-value]
    if user.role in allowed_set:
        return user.role
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=f"{user.acting_role} rolü bu işlem için yetkili değil.",
    )
