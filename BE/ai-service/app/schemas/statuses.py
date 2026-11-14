from enum import StrEnum


class OperationStatus(StrEnum):
    SUCCESS = "SUCCESS"


class DocumentStatus(StrEnum):
    APPROVED = "APPROVED"
    EXPIRED = "EXPIRED"
    REVOKED = "REVOKED"
    ARCHIVED = "ARCHIVED"


class ScopeResult(StrEnum):
    IN_SCOPE = "IN_SCOPE"
    OUT_OF_SCOPE = "OUT_OF_SCOPE"


class AnswerStatus(StrEnum):
    ANSWERED = "ANSWERED"
    SUCCESS = "ANSWERED"
    NEED_CLARIFICATION = "NEED_CLARIFICATION"
    REJECTED = "REJECTED"
    INSUFFICIENT_KNOWLEDGE = "REJECTED"
