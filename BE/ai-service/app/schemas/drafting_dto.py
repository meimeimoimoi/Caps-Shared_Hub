from pydantic import BaseModel
from typing import Dict, Any, List

class GenerateDraftRequest(BaseModel):
    document_id: str
    snapshot_data: Dict[str]
    template_schema: Dict[str, Any]
    period_start: str
    period_end: str

class GenerateDraftResponse(BaseModel):
    status: str
    content: Dict[str, Any]
    content_hash: str
    has_unathorized_number: bool
    unathorized_number: List[str]
    citations: List[str, Any]
