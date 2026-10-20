import json

from fastapi import APIRouter, HTTPException, status
from app.schemas.errors import ErrorMessage
from app.schemas.ingestion_dto import IngestDocRequest, IngestDocResponse
from app.schemas.chat_dto import ChatQueryRequest, ChatQueryResponse
from app.schemas.drafting_dto import GenerateDraftRequest, GenerateDraftResponse
from app.modules.ingestion.chunker import LegalChunker
from app.modules.ingestion.indexer import LegalIndexer
from app.modules.rag.router import ScopeRouter
from app.modules.rag.retriever import TemporalRetriever
from app.modules.rag.generator import GroundedGenerator
from app.modules.drafting.drafter import DocumentDrafter
from app.schemas.statuses import ScopeResult, AnswerStatus, OperationStatus
from app.schemas.answers import (
    OUT_OF_SCOPE_ANSWER,
    TAX_PERIOD_CLARIFICATION_ANSWER,
)

router = APIRouter(prefix="/api/v1")

# API FLOW 2: Called by ingestion (.NET).
@router.post("/kb/chunk-and-embed", response_model=IngestDocResponse)
def chunk_and_embed(req: IngestDocRequest):
    chunks = LegalChunker.chunk_document(req.model_dump())
    if not chunks:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=ErrorMessage.EMPTY_DOCUMENT
        )
    kb_chunks = LegalIndexer.index_to_qdrant(chunks)
    return IngestDocResponse(status=OperationStatus.SUCCESS, total_chunks=len(kb_chunks), kb_chunks=kb_chunks)

# API FLOW 3: Được gọi từ `rag-query` (.NET)
@router.post("/chat/query", response_model=ChatQueryResponse)
def chat_query(req: ChatQueryRequest):
    # Classify scope and resolve the requested tax period.
    analysis = ScopeRouter.analyze(req.question, req.user_tax_period)

    if not analysis.is_cit:
        return ChatQueryResponse(
            scope_result=ScopeResult.OUT_OF_SCOPE,
            answer_status=AnswerStatus.REJECTED,
            period_start=None, period_end=None,
            answer=OUT_OF_SCOPE_ANSWER,
            citations=[]
        )

    if analysis.needs_clarification or not analysis.period_start or not analysis.period_end:
        return ChatQueryResponse(
            scope_result=ScopeResult.IN_SCOPE,
            answer_status=AnswerStatus.NEED_CLARIFICATION,
            period_start=None, period_end=None,
            answer=analysis.clarification_msg or TAX_PERIOD_CLARIFICATION_ANSWER,
            citations=[]
        )

    p_start = analysis.period_start.isoformat()
    p_end = analysis.period_end.isoformat()

    # 2. Truy xuất Temporal Vector từ Qdrant
    retrieved = TemporalRetriever.retrieve(req.question, p_start, p_end)

    # 3. Sinh câu trả lời có trích dẫn
    res = GroundedGenerator.generate_answer(req.question, retrieved, f"{p_start} đến {p_end}")

    return ChatQueryResponse(
        scope_result=ScopeResult.IN_SCOPE,
        answer_status=res["answer_status"],
        period_start=p_start,
        period_end=p_end,
        answer=res["answer"],
        citations=res["citations"]
    )

# API FLOW 4: Được gọi từ `workflow` (.NET)
@router.post("/drafting/generate", response_model=GenerateDraftResponse)
def draft_document(req: GenerateDraftRequest):
    retrieved = TemporalRetriever.retrieve(
        query=json.dumps(req.snapshot_data, ensure_ascii=False),
        period_start=req.period_start,
        period_end=req.period_end
    )
    context = "\n".join([h.payload["text_content"] for h in retrieved])
    
    result = DocumentDrafter.generate_draft(req.snapshot_data, req.template_schema, context)
    
    citations = [{"legal_source_id": h.payload.get("legal_source_id"), "article": h.payload.get("article")} for h in retrieved]

    return GenerateDraftResponse(
        status=OperationStatus.SUCCESS,
        content=result["content"],
        content_hash=result["content_hash"],
        has_unauthorized_numbers=result["has_unauthorized_numbers"],
        unauthorized_numbers=result["unauthorized_numbers"],
        citations=citations
    )
