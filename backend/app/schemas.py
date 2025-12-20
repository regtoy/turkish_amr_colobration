from datetime import datetime
from typing import Optional

from sqlmodel import SQLModel

from .enums import ReviewDecision, Role
from .models import AuditLog


class ProjectCreate(SQLModel):
    name: str
    description: Optional[str] = None
    language: str = "tr"
    amr_version: str = "1.0"
    role_set_version: str = "tr-propbank"
    validation_rule_version: str = "v1"


class SentenceCreate(SQLModel):
    text: str
    source: Optional[str] = None
    difficulty_tag: Optional[str] = None


class AssignmentRequest(SQLModel):
    user_id: int
    role: Role = Role.ANNOTATOR
    is_blind: bool = False


class AnnotationSubmit(SQLModel):
    penman_text: str
    validity_report: Optional[str] = None


class ReviewSubmit(SQLModel):
    annotation_id: int
    decision: ReviewDecision
    score: Optional[float] = None
    comment: Optional[str] = None
    is_multi_annotator: bool = False


class AdjudicationSubmit(SQLModel):
    final_penman: str
    decision_note: Optional[str] = None
    source_annotation_ids: Optional[list[int]] = None


class ReopenRequest(SQLModel):
    reason: Optional[str] = None


class ProjectSummary(SQLModel):
    project_id: int
    total_sentences: int
    statuses: dict[str, int]
    assignments_by_role: dict[str, int]
    annotations: int
    reviews: int
    adjudications: int


class AuditLogPage(SQLModel):
    total: int
    limit: int
    offset: int
    items: list[AuditLog]


class UserCreate(SQLModel):
    username: str
    email: Optional[str] = None
    password: str


class UserLogin(SQLModel):
    username: str
    password: str


class UserPublic(SQLModel):
    id: int
    username: str
    email: Optional[str] = None
    role: Role
    is_active: bool


class TokenResponse(SQLModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    role: Role


class ProjectMembershipRequest(SQLModel):
    user_id: int
    role: Role


class ProjectMembershipUpdate(SQLModel):
    role: Optional[Role] = None
    is_active: Optional[bool] = None


class ProjectMembershipPublic(SQLModel):
    user_id: int
    project_id: int
    role: Role
    is_active: bool
    approved_at: Optional[datetime] = None
