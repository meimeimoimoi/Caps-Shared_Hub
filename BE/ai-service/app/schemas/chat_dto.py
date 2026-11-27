from typing import List, Optional  # noqa: UP035

from pydantic import BaseModel, Field, field_validator

from app.config import settings
from app.schemas.statuses import AnswerStatus, ScopeResult


class ChatQueryRequest(BaseModel):
    # Aligned with .NET workflow SendChatMessageRequest (4000) + Clarification suffix (2000).
    question: str = Field(..., min_length=1, max_length=6000)
    user_tax_period: Optional[str] = Field(default=None, max_length=100)

    @field_validator("question")
    @classmethod
    def validate_question(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("question must not be blank.")
        max_chars = settings.CHAT_MAX_QUESTION_CHARS
        if len(cleaned) > max_chars:
            raise ValueError(f"question exceeds maximum length of {max_chars} characters.")
        return cleaned


class CitationItem(BaseModel):
    legal_source_id: Optional[str] = None
    document_number: Optional[str] = None
    doc_title: Optional[str] = None
    article: Optional[str] = None
    clause: Optional[str] = None
    point: Optional[str] = None
    text: Optional[str] = None
    effective_from: Optional[str] = None
    effective_to: Optional[str] = None


class ChatQueryResponse(BaseModel):
    scope_result: ScopeResult
    answer_status: AnswerStatus
    period_start: Optional[str]
    period_end: Optional[str]
    answer: str
    citations: List[CitationItem] = []
