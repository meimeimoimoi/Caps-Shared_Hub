from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from app.schemas.statuses import OperationStatus

class IngestDocRequest(BaseModel):
    knowledge_document_id: str
    legal_source_id: str
    document_number: str
    title: str
    effective_from: str          # Định dạng: YYYY-MM-DD
    effective_to: Optional[str] = None
    content_json: Dict[str, Any] # Dữ liệu bóc tách văn bản

class KbChunkItem(BaseModel):
    chunk_index: int
    qdrant_point_id: str
    article: Optional[str]
    clause: Optional[str]
    point: Optional[str]
    effective_from: str
    effective_to: Optional[str]
    metadata: Dict[str, Any]

class IngestDocResponse(BaseModel):
    status: OperationStatus
    total_chunks: int
    kb_chunks: List[KbChunkItem]
