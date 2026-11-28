from datetime import date
import logging
import time

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
import httpx

from app.api.dependencies import verify_internal_key
from app.config import settings
from app.core.concurrency import run_with_total_timeout
from app.modules.cv_screening.extractor import CvExtractor
from app.modules.drafting.drafter import (
    DocumentDrafter,
    build_draft_retrieval_query,
    prioritize_draft_hits,
)
from app.modules.ingestion.chunker import ChunkValidationError, LegalChunker
from app.modules.ingestion.indexer import LegalIndexer
from app.modules.rag.generator import (
    GroundedGenerator,
    build_citations,
    format_context_chunks,
)
from app.modules.rag.retriever import DRAFT_RETRIEVAL_LIMIT, TemporalRetriever
from app.modules.rag.router import ScopeRouter
from app.schemas.answers import OUT_OF_SCOPE_ANSWER, TAX_PERIOD_CLARIFICATION_ANSWER
from app.schemas.chat_dto import ChatQueryRequest, ChatQueryResponse
from app.schemas.cv_dto import CvExtractResponse
from app.schemas.drafting_dto import GenerateDraftRequest, GenerateDraftResponse
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


def _validate_draft_period(period_start: str, period_end: str) -> tuple[str, str]:
    """Validate ISO YYYY-MM-DD bounds and chronological order for drafting requests."""
    try:
        start_date = date.fromisoformat((period_start or "").strip())
        end_date = date.fromisoformat((period_end or "").strip())
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid tax period format (expected YYYY-MM-DD).",
        ) from e

    if not (1900 <= start_date.year <= 2100 and 1900 <= end_date.year <= 2100):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tax period year must be between 1900 and 2100.",
        )
    if start_date > end_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="period_start must be on or before period_end.",
        )
    supported = {y.strip() for y in settings.DRAFT_SUPPORTED_TAX_YEARS.split(",") if y.strip()}
    if supported and not {str(start_date.year), str(end_date.year)} <= supported:
        # Workflow already limits drafts to the template's tax year; a direct call must not bypass it (SH-04).
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"No drafting template for tax period {start_date.year}; supported years: {', '.join(sorted(supported))}.",
        )
    return start_date.isoformat(), end_date.isoformat()


# API FLOW 2: Called by ingestion (.NET).
@router.post("/kb/chunk-and-embed", response_model=IngestDocResponse)
def chunk_and_embed(req: IngestDocRequest):
    try:
        chunks_to_index = LegalChunker.prepare_ingest_chunks(req)
        kb_chunks = LegalIndexer.index_to_qdrant(chunks_to_index)
        return IngestDocResponse(
            status=OperationStatus.SUCCESS,
            total_chunks=len(kb_chunks),
            kb_chunks=kb_chunks,
        )
    except ChunkValidationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Unhandled error in chunk_and_embed")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI ingestion service is temporarily unavailable.",
        ) from e


@router.delete("/kb/documents/{knowledge_document_id}", response_model=DeleteDocumentVectorsResponse)
def delete_document_vectors(knowledge_document_id: str):
    """Delete all Qdrant vector points for the specified knowledge document."""
    doc_id = knowledge_document_id.strip()
    if not doc_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="knowledge_document_id is required.")

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


@router.patch("/kb/documents/{knowledge_document_id}/metadata", response_model=UpdateDocumentMetadataResponse)
def update_document_metadata(knowledge_document_id: str, req: UpdateDocumentMetadataRequest):
    """Update validity dates or status payload across all chunks of a knowledge document."""
    doc_id = knowledge_document_id.strip()
    if not doc_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="knowledge_document_id is required.")

    updates = {field: getattr(req, field) for field in req.model_fields_set}
    if not updates:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one metadata field must be provided.",
        )

    try:
        matched_count = LegalIndexer.update_document_metadata(doc_id, updates)
        if matched_count == 0:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document vectors not found.")
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
    deadline = time.monotonic() + float(settings.REQUEST_TIMEOUT_SECONDS)

    def _execute() -> ChatQueryResponse:
        analysis = ScopeRouter.analyze(req.question, req.user_tax_period)
        if not analysis.is_cit:
            return ChatQueryResponse(
                scope_result=ScopeResult.OUT_OF_SCOPE,
                answer_status=AnswerStatus.REJECTED,
                period_start=None,
                period_end=None,
                answer=analysis.out_of_scope_msg or OUT_OF_SCOPE_ANSWER,
                citations=[],
            )
        if analysis.needs_clarification or not analysis.period_start or not analysis.period_end:
            return ChatQueryResponse(
                scope_result=ScopeResult.IN_SCOPE,
                answer_status=AnswerStatus.NEED_CLARIFICATION,
                period_start=None,
                period_end=None,
                answer=analysis.clarification_msg or TAX_PERIOD_CLARIFICATION_ANSWER,
                citations=[],
            )
        if time.monotonic() >= deadline:
            raise TimeoutError("Chat request deadline exceeded after scope routing.")

        p_start, p_end = analysis.period_start.isoformat(), analysis.period_end.isoformat()
        retrieved = TemporalRetriever.retrieve_for_chat(req.question, p_start, p_end)
        if time.monotonic() >= deadline:
            raise TimeoutError("Chat request deadline exceeded after retrieval.")

        res = GroundedGenerator.generate_answer(
            req.question, retrieved, f"{p_start} đến {p_end}", deadline=deadline
        )
        return ChatQueryResponse(
            scope_result=ScopeResult.IN_SCOPE,
            answer_status=res["answer_status"],
            period_start=p_start,
            period_end=p_end,
            answer=res["answer"],
            citations=res["citations"],
        )

    try:
        return run_with_total_timeout(_execute, float(settings.REQUEST_TIMEOUT_SECONDS))
    except HTTPException:
        raise
    except (httpx.TimeoutException, TimeoutError) as e:
        logger.warning("Timed out processing chat_query")
        raise HTTPException(status_code=status.HTTP_504_GATEWAY_TIMEOUT, detail="AI chat service timed out.") from e
    except Exception as e:
        logger.exception("Unhandled error in chat_query")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI chat service is temporarily unavailable.",
        ) from e


# API FLOW 4: Called by workflow (.NET)
@router.post("/drafting/generate", response_model=GenerateDraftResponse)
def draft_document(req: GenerateDraftRequest):
    def _execute() -> GenerateDraftResponse:
        valid_start, valid_end = _validate_draft_period(req.period_start, req.period_end)
        retrieval_query = build_draft_retrieval_query(req.snapshot_data, req.template_schema)
        retrieved = TemporalRetriever.retrieve(
            query=retrieval_query, period_start=valid_start, period_end=valid_end, limit=DRAFT_RETRIEVAL_LIMIT
        )
        retrieved = prioritize_draft_hits(retrieved, req.snapshot_data, req.template_schema)
        context = format_context_chunks(retrieved)
        citations = build_citations(retrieved, include_text=False)

        result = DocumentDrafter.generate_draft(
            req.snapshot_data,
            req.template_schema,
            context,
            citations=citations,
            retrieved_hits=retrieved,
        )
        return GenerateDraftResponse(
            status=OperationStatus.SUCCESS,
            content=result["content"],
            content_hash=result["content_hash"],
            has_unauthorized_numbers=result["has_unauthorized_numbers"],
            unauthorized_numbers=result["unauthorized_numbers"],
            citations=citations,
            has_grounding_issues=result.get("has_grounding_issues", False),
            issues=result.get("issues", []),
        )

    try:
        return run_with_total_timeout(_execute, float(settings.REQUEST_TIMEOUT_SECONDS))
    except HTTPException:
        raise
    except (httpx.TimeoutException, TimeoutError) as e:
        logger.warning("Timed out processing draft_document for document %s", req.document_id)
        raise HTTPException(status_code=status.HTTP_504_GATEWAY_TIMEOUT, detail="AI drafting service timed out.") from e
    except Exception as e:
        logger.exception("Unhandled error in draft_document for document %s", req.document_id)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI drafting service is temporarily unavailable.",
        ) from e


# API FLOW 1 (Step 3): Called by expert (.NET) to extract CV metadata only.
@router.post("/cv/extract", response_model=CvExtractResponse)
async def extract_cv_metadata(file: UploadFile = File(...), evidence_type: str = Form(...)):
    if evidence_type.strip().upper() != "CV":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only CV documents may be processed by AI.",
        )

    try:
        content = await file.read()
        return CvExtractor.extract(content=content, evidence_type=evidence_type)
    except HTTPException:
        raise
    except httpx.TimeoutException as e:
        logger.warning("Timed out extracting document for group %s", evidence_type)
        raise HTTPException(status_code=status.HTTP_504_GATEWAY_TIMEOUT, detail="AI extraction timed out.") from e
    except Exception as e:
        logger.warning("Extraction error for group %s: %s", evidence_type, type(e).__name__)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI CV screening service is temporarily unavailable.",
        ) from e
