from typing import Any, Dict, List, Optional  # noqa: UP035

from pydantic import BaseModel

from app.schemas.statuses import OperationStatus


class CrawlerChunkItem(BaseModel):
    chunk_index: int
    article: Optional[str]
    clause: Optional[str]
    point: Optional[str]
    path: Optional[str]
    text: str
    effective_from: Optional[str] = None
    effective_to: Optional[str] = None


class IngestDocRequest(BaseModel):
    knowledge_document_id: str
    legal_source_id: str
    document_number: str
    title: str
    doc_type: Optional[str] = None
    effective_from: Optional[str] = None  # Định dạng: YYYY-MM-DD
    effective_to: Optional[str] = None
    vbhn_effective_from: Optional[str] = None  # Cho văn bản hợp nhất
    content_json: Dict[str, Any]  # Dữ liệu bóc tách văn bản
    chunks: Optional[List[CrawlerChunkItem]] = []


class KbChunkItem(BaseModel):
    chunk_index: int
    qdrant_point_id: str
    article: Optional[str]
    clause: Optional[str]
    point: Optional[str]
    effective_from: Optional[str]
    effective_to: Optional[str]
    metadata: Dict[str, Any]


class IngestDocResponse(BaseModel):
    status: OperationStatus
    total_chunks: int
    kb_chunks: List[KbChunkItem]
