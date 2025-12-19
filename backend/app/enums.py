from enum import Enum


class Role(str, Enum):
    GUEST = "guest"
    PENDING = "pending"
    ANNOTATOR = "annotator"
    REVIEWER = "reviewer"
    CURATOR = "curator"
    ADMIN = "admin"
    ASSIGNMENT_ENGINE = "assignment_engine"


class SentenceStatus(str, Enum):
    NEW = "NEW"
    ASSIGNED = "ASSIGNED"
    SUBMITTED = "SUBMITTED"
    IN_REVIEW = "IN_REVIEW"
    ADJUDICATED = "ADJUDICATED"
    ACCEPTED = "ACCEPTED"


class ReviewDecision(str, Enum):
    APPROVE = "approve"
    NEEDS_FIX = "needs_fix"
    REJECT = "reject"
