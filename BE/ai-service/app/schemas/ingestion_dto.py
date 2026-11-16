from typing import Any, Dict, List, Optional  # noqa: UP035

from pydantic import BaseModel

from app.schemas.statuses import DocumentStatus, OperationStatus


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
    effective_from: Optional[str] = None  # Format: YYYY-MM-DD
    effective_to: Optional[str] = None
    vbhn_effective_from: Optional[str] = None  # For consolidated legal documents (VBHN)
    content_json: Optional[Dict[str, Any]] = None  # Parsed document structure
    chunks: Optional[List[CrawlerChunkItem]] = None


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


class DeleteDocumentVectorsResponse(BaseModel):
    """Response returned after deleting all vectors of a document."""

    status: OperationStatus
    knowledge_document_id: str
    deleted_count: int


class UpdateDocumentMetadataRequest(BaseModel):
    """Partial payload update for all indexed chunks of a document."""

    effective_from: Optional[str] = None
    effective_to: Optional[str] = None
    status: Optional[DocumentStatus] = None


class UpdateDocumentMetadataResponse(BaseModel):
    """Response returned after updating document metadata in Qdrant."""

    status: OperationStatus
    knowledge_document_id: str
    matched_count: int
