from collections import Counter
from typing import Iterable, Sequence

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlmodel import Session, select

from ..enums import AssignmentStrategy, Role
from ..models import Assignment, ProjectMembership, Sentence, UserProfile


class AssignmentEngine:
    """Select annotators for a sentence using different strategies."""

    def __init__(self, session: Session) -> None:
        self.session = session

    def select_assignees(
        self,
        *,
        project_id: int,
        strategy: AssignmentStrategy,
        role: Role,
        count: int,
        required_skills: Sequence[str] | None,
        provided_assignees: Iterable[int] | None,
        exclude_user_ids: set[int],
    ) -> list[int]:
        if count < 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="En az bir atama yapılmalıdır."
            )

        eligible_members = self._eligible_member_ids(project_id=project_id, role=role)

        if provided_assignees:
            assignees: list[int] = []
            for user_id in provided_assignees:
                if user_id in eligible_members and user_id not in exclude_user_ids and user_id not in assignees:
                    assignees.append(user_id)
            if not assignees:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Geçerli bir hedef kullanıcı bulunamadı.",
                )
            return assignees[:count]

        strategy_fn = {
            AssignmentStrategy.ROUND_ROBIN: self._round_robin,
            AssignmentStrategy.SKILL_BASED: self._skill_based,
        }.get(strategy)

        if strategy_fn is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Geçersiz atama stratejisi.")

        assignee_ids = strategy_fn(
            project_id=project_id,
            role=role,
            count=count,
            eligible_user_ids=eligible_members,
            required_skills=required_skills,
            exclude_user_ids=exclude_user_ids,
        )
        if not assignee_ids:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Uygun anotatör bulunamadı.",
            )
        if len(assignee_ids) < count:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Yeterli sayıda anotatör bulunamadı.",
            )
        return assignee_ids

    def _eligible_member_ids(self, *, project_id: int, role: Role) -> set[int]:
        rows = self.session.exec(
            select(ProjectMembership.user_id).where(
                ProjectMembership.project_id == project_id,
                ProjectMembership.role == role,
                ProjectMembership.is_active.is_(True),
            )
        ).all()
        return {user_id for (user_id,) in rows}

    def _assignment_load(self, *, project_id: int, role: Role) -> Counter:
        rows = self.session.exec(
            select(Assignment.user_id, func.count())
            .join(Sentence, Sentence.id == Assignment.sentence_id)
            .where(
                Sentence.project_id == project_id,
                Assignment.role == role,
                Assignment.is_active.is_(True),
            )
            .group_by(Assignment.user_id)
        ).all()
        return Counter({user_id: count for user_id, count in rows})

    def _round_robin(
        self,
        *,
        project_id: int,
        role: Role,
        count: int,
        eligible_user_ids: set[int],
        required_skills: Sequence[str] | None,
        exclude_user_ids: set[int],
    ) -> list[int]:
        load = self._assignment_load(project_id=project_id, role=role)
        candidates = [user_id for user_id in eligible_user_ids if user_id not in exclude_user_ids]
        sorted_candidates = sorted(candidates, key=lambda uid: (load.get(uid, 0), uid))
        return sorted_candidates[:count]

    def _skill_based(
        self,
        *,
        project_id: int,
        role: Role,
        count: int,
        eligible_user_ids: set[int],
        required_skills: Sequence[str] | None,
        exclude_user_ids: set[int],
    ) -> list[int]:
        if not required_skills:
            return self._round_robin(
                project_id=project_id,
                role=role,
                count=count,
                eligible_user_ids=eligible_user_ids,
                required_skills=None,
                exclude_user_ids=exclude_user_ids,
            )

        profiles = self.session.exec(
            select(UserProfile).where(
                UserProfile.user_id.in_(eligible_user_ids),
                UserProfile.is_active.is_(True),
            )
        ).all()

        required_set = {skill.lower() for skill in required_skills}
        load = self._assignment_load(project_id=project_id, role=role)
        scored_profiles: list[tuple[int, int]] = []
        for profile in profiles:
            profile_skills = {skill.lower() for skill in profile.skills or []}
            overlap = len(required_set & profile_skills)
            if overlap and profile.user_id not in exclude_user_ids:
                scored_profiles.append((overlap, profile.user_id))

        if not scored_profiles:
            return []

        sorted_candidates = sorted(
            scored_profiles,
            key=lambda candidate: (-candidate[0], load.get(candidate[1], 0), candidate[1]),
        )
        return [user_id for _, user_id in sorted_candidates][:count]
