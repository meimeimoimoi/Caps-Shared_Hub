from enum import StrEnum
from typing import Any, Dict, List  # noqa: UP035

from pydantic import BaseModel, Field

from app.schemas.statuses import OperationStatus


class DraftIssueSeverity(StrEnum):
    BLOCKING = "BLOCKING"
    WARNING = "WARNING"


class DraftIssueItem(BaseModel):
    code: str
    type: str
    severity: DraftIssueSeverity
    description: str
    field_id: str | None = None
    citation_id: str | None = None


class GenerateDraftRequest(BaseModel):
    document_id: str
    snapshot_data: Dict[str, Any]
    template_schema: Dict[str, Any] | List[Dict[str, Any]]
    period_start: str
    period_end: str


class GenerateDraftResponse(BaseModel):
    status: OperationStatus
    content: Dict[str, Any]
    content_hash: str
    has_unauthorized_numbers: bool
    unauthorized_numbers: List[str]
    citations: List[Dict[str, Any]]
    has_grounding_issues: bool = False
    issues: List[DraftIssueItem] = Field(default_factory=list)
