from enum import StrEnum

class OperationStatus(StrEnum):
    SUCCESS = "SUCCESS"


class DocumentStatus(StrEnum):
    APPROVED = "APPROVED"
    
class ScopeResult(StrEnum):
    IN_SCOPE = "IN_SCOPE"
    OUT_OF_SCOPE = "OUT_OF_SCOPE"
    
class AnswerStatus(StrEnum):
    REJECTED = "REJECTED"
    NEED_CLARIFICATION = "NEED_CLARIFICATION"
    INSUFFICIENT_KNOWLEDGE = "INSUFFICIENT_KNOWLEDGE"
    SUCCESS = "SUCCESS"
