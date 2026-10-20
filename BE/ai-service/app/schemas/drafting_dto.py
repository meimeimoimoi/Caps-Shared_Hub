from pydantic import BaseModel
from typing import Dict, Any, List
from app.schemas.statuses import OperationStatus

class GenerateDraftRequest(BaseModel):
    document_id: str
    snapshot_data: Dict[str, Any]
    template_schema: Dict[str, Any]
    period_start: str
    period_end: str

class GenerateDraftResponse(BaseModel):
    status: OperationStatus
    content: Dict[str, Any]
    content_hash: str
    has_unauthorized_numbers: bool
    unauthorized_numbers: List[str]
    citations: List[Dict[str, Any]]