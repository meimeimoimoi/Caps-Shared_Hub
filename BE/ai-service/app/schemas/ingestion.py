from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class IngesDocRequest(BaseModel):
    knowleged_document_id: str
    legal_source_id: str
    document_number: str
    title: str
    effective_from: str  # YYYY-MM-DD
    effective_to: Optional[str]
    content_json: Dict[str, Any]

class KbChunkItem(BaseModel):
    chunk_index: int
    qdrant_point_id: str
    article: Optional[str]
    clause: Optional[str]
    point: Optional[str]
    effective_from: str
    effective_to: Optional[str]
    metadata: Dict[str, Any]

class IngestDocReponse(BaseModel):
    status: str
    total_chunks: int
    kb_chunk: List[KbChunkItem]