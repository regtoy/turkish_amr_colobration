from typing import Optional

from sqlmodel import SQLModel

from .enums import ReviewDecision, Role


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
