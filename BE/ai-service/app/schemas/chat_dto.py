from typing import List, Optional  # noqa: UP035

from pydantic import BaseModel

from app.schemas.statuses import AnswerStatus, ScopeResult


class ChatQueryRequest(BaseModel):
    question: str
    user_tax_period: Optional[str] = None


class CitationItem(BaseModel):
    legal_source_id: Optional[str] = None
    document_number: Optional[str] = None
    article: Optional[str] = None
    clause: Optional[str] = None
    point: Optional[str] = None


class ChatQueryResponse(BaseModel):
    scope_result: ScopeResult
    answer_status: AnswerStatus
    period_start: Optional[str]
    period_end: Optional[str]
    answer: str
    citations: List[CitationItem] = []
