import json
import logging

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.dependencies import verify_internal_key
from app.modules.drafting.drafter import DocumentDrafter
from app.modules.ingestion.chunker import LegalChunker
from app.modules.ingestion.indexer import LegalIndexer
from app.modules.rag.generator import GroundedGenerator
from app.modules.rag.retriever import TemporalRetriever
from app.modules.rag.router import ScopeRouter
from app.schemas.answers import (
    OUT_OF_SCOPE_ANSWER,
    TAX_PERIOD_CLARIFICATION_ANSWER,
)
from app.schemas.chat_dto import ChatQueryRequest, ChatQueryResponse
from app.schemas.drafting_dto import GenerateDraftRequest, GenerateDraftResponse
from app.schemas.errors import ErrorChunkEmpty, ErrorMessage
from app.schemas.ingestion_dto import (
    DeleteDocumentVectorsResponse,
    IngestDocRequest,
    IngestDocResponse,
    UpdateDocumentMetadataRequest,
    UpdateDocumentMetadataResponse,
)
from app.schemas.statuses import AnswerStatus, OperationStatus, ScopeResult

router = APIRouter(prefix="/api/v1", dependencies=[Depends(verify_internal_key)])
logger = logging.getLogger(__name__)


# API FLOW 2: Called by ingestion (.NET).
@router.post("/kb/chunk-and-embed", response_model=IngestDocResponse)
def chunk_and_embed(req: IngestDocRequest):
    try:
        chunks_to_index = []

        # Use pre-built chunks if provided by the caller
        if req.chunks and len(req.chunks) > 0:
            default_eff_from = req.effective_from or req.vbhn_effective_from

            for c in req.chunks:
                chunks_to_index.append(
                    {
                        "doc_id": req.knowledge_document_id,
                        "source_id": req.legal_source_id,
                        "doc_number": req.document_number,
                        "doc_title": req.title,
                        "article": f"Điều {c.article}"
                        if c.article and not str(c.article).startswith("Điều")
                        else c.article,
                        "clause": f"Khoản {c.clause}"
                        if c.clause and not str(c.clause).startswith("Khoản")
                        else c.clause,
                        "point": f"Điểm {c.point}"
                        if c.point and not str(c.point).startswith("Điểm")
                        else c.point,
                        "effective_from": c.effective_from or default_eff_from,
                        "effective_to": c.effective_to or req.effective_to,
                        "text": c.text,
                    }
                )
        else:
            # Otherwise chunk directly from content_json
            if not req.content_json:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=ErrorChunkEmpty.EMPTY_CHUNK,
                )
            chunks_to_index = LegalChunker.chunk_document(req.model_dump())

        if not chunks_to_index:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=ErrorChunkEmpty.EMPTY_CHUNK,
            )

        # Generate embeddings and upsert into Qdrant
        kb_chunks = LegalIndexer.index_to_qdrant(chunks_to_index)

        return IngestDocResponse(
            status=OperationStatus.SUCCESS,
            total_chunks=len(kb_chunks),
            kb_chunks=kb_chunks,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Unhandled error in chunk_and_embed")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI ingestion service is temporarily unavailable.",
        ) from e


@router.delete(
    "/kb/documents/{knowledge_document_id}",
    response_model=DeleteDocumentVectorsResponse,
)
def delete_document_vectors(knowledge_document_id: str):
    """Delete all Qdrant vector points for the specified knowledge document."""
    doc_id = knowledge_document_id.strip()
    if not doc_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="knowledge_document_id is required.",
        )

    try:
        deleted_count = LegalIndexer.delete_by_document_id(doc_id)
        return DeleteDocumentVectorsResponse(
            status=OperationStatus.SUCCESS,
            knowledge_document_id=doc_id,
            deleted_count=deleted_count,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Unhandled error in delete_document_vectors")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI vector service is temporarily unavailable.",
        ) from e


@router.patch(
    "/kb/documents/{knowledge_document_id}/metadata",
    response_model=UpdateDocumentMetadataResponse,
)
def update_document_metadata(
    knowledge_document_id: str,
    req: UpdateDocumentMetadataRequest,
):
    """Update validity dates or status payload across all chunks of a knowledge document."""
    doc_id = knowledge_document_id.strip()
    if not doc_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="knowledge_document_id is required.",
        )

    updates = {field: getattr(req, field) for field in req.model_fields_set}
    if not updates:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one metadata field must be provided.",
        )

    try:
        matched_count = LegalIndexer.update_document_metadata(doc_id, updates)
        if matched_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document vectors not found.",
            )
        return UpdateDocumentMetadataResponse(
            status=OperationStatus.SUCCESS,
            knowledge_document_id=doc_id,
            matched_count=matched_count,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid metadata field or date format (expected YYYY-MM-DD).",
        ) from e
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Unhandled error in update_document_metadata")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI vector service is temporarily unavailable.",
        ) from e


# API FLOW 3: Called by rag-query (.NET)
@router.post("/chat/query", response_model=ChatQueryResponse)
def chat_query(req: ChatQueryRequest):
    try:
        # Classify scope and resolve the requested tax period.
        analysis = ScopeRouter.analyze(req.question, req.user_tax_period)

        if not analysis.is_cit:
            return ChatQueryResponse(
                scope_result=ScopeResult.OUT_OF_SCOPE,
                answer_status=AnswerStatus.REJECTED,
                period_start=None,
                period_end=None,
                answer=OUT_OF_SCOPE_ANSWER,
                citations=[],
            )

        if (
            analysis.needs_clarification
            or not analysis.period_start
            or not analysis.period_end
        ):
            return ChatQueryResponse(
                scope_result=ScopeResult.IN_SCOPE,
                answer_status=AnswerStatus.NEED_CLARIFICATION,
                period_start=None,
                period_end=None,
                answer=analysis.clarification_msg or TAX_PERIOD_CLARIFICATION_ANSWER,
                citations=[],
            )

        p_start = analysis.period_start.isoformat()
        p_end = analysis.period_end.isoformat()

        # Retrieve temporally valid vector chunks from Qdrant.
        retrieved = TemporalRetriever.retrieve(req.question, p_start, p_end)

        # Generate grounded answer with legal citations.
        res = GroundedGenerator.generate_answer(
            req.question, retrieved, f"{p_start} đến {p_end}"
        )

        return ChatQueryResponse(
            scope_result=ScopeResult.IN_SCOPE,
            answer_status=res["answer_status"],
            period_start=p_start,
            period_end=p_end,
            answer=res["answer"],
            citations=res["citations"],
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Unhandled error in chat_query")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI chat service is temporarily unavailable.",
        ) from e


# API FLOW 4: Called by workflow (.NET)
@router.post("/drafting/generate", response_model=GenerateDraftResponse)
def draft_document(req: GenerateDraftRequest):
    try:
        retrieved = TemporalRetriever.retrieve(
            query=json.dumps(req.snapshot_data, ensure_ascii=False),
            period_start=req.period_start,
            period_end=req.period_end,
        )
        context = "\n".join(
            [(h.payload or {}).get("text_content", "") for h in retrieved]
        )

        result = DocumentDrafter.generate_draft(
            req.snapshot_data, req.template_schema, context
        )

        citations = [
            {
                "legal_source_id": (h.payload or {}).get("legal_source_id"),
                "document_number": (h.payload or {}).get("document_number"),
                "doc_title": (h.payload or {}).get("document_title"),
                "article": (h.payload or {}).get("article"),
                "clause": (h.payload or {}).get("clause"),
                "point": (h.payload or {}).get("point"),
                "effective_from": (h.payload or {}).get("effective_from"),
                "effective_to": (h.payload or {}).get("effective_to"),
            }
            for h in retrieved
        ]

        return GenerateDraftResponse(
            status=OperationStatus.SUCCESS,
            content=result["content"],
            content_hash=result["content_hash"],
            has_unauthorized_numbers=result["has_unauthorized_numbers"],
            unauthorized_numbers=result["unauthorized_numbers"],
            citations=citations,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Unhandled error in draft_document")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI drafting service is temporarily unavailable.",
        ) from e
