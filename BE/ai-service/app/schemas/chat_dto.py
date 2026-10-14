from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class ChatQueryRequest(BaseModel):
    question: str
    user_tax_period: Optional[str] = None

class CitationItem(BaseModel):
    legal_source_id: str
    document_number: str
    article: Optional[str]
    clause: Optional[str]
    point: Optional[str]

class ChatQueryResponse(BaseModel):
    scope_reult: str
    answer_status: str
    period_start: Optional[str]
    period_end: Optional[str]
    answer: str
    citations: List[CitationItem] = []
