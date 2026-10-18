import json

from fastapi import APIRouter, HTTPException
from app.schemas.ingestion_dto import IngestDocRequest, IngestDocResponse
from app.schemas.chat_dto import ChatQueryRequest, ChatQueryResponse
from app.schemas.drafting_dto import GenerateDraftRequest, GenerateDraftResponse
from app.modules.ingestion.chunker import LegalChunker
from app.modules.ingestion.indexer import LegalIndexer
from app.modules.rag.router import ScopeRouter
from app.modules.rag.retriever import TemporalRetriever
from app.modules.rag.generator import GroundedGenerator
from app.modules.drafting.drafter import DocumentDrafter

router = APIRouter(prefix="/api/v1")

# API FLOW 2: Được gọi từ `ingestion` (.NET)
@router.post("/kb/chunk-and-embed", response_model=IngestDocResponse)
def chunk_and_embed(req: IngestDocRequest):
    try:
        chunks = LegalChunker.chunk_document(req.model_dump())
        if not chunks:
            raise HTTPException(status_code=400, detail="Không có nội dung để chunk.")
        kb_chunks = LegalIndexer.index_to_qdrant(chunks)
        return IngestDocResponse(status="SUCCESS", total_chunks=len(kb_chunks), kb_chunks=kb_chunks)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e

# API FLOW 3: Được gọi từ `rag-query` (.NET)
@router.post("/chat/query", response_model=ChatQueryResponse)
def chat_query(req: ChatQueryRequest):
    # 1. Phân loại Scope & Bóc tách ngày
    analysis = ScopeRouter.analyze(req.question)

    if not analysis.get("is_cit"):
        return ChatQueryResponse(
            scope_result="OUT_OF_SCOPE",
            answer_status="REJECTED",
            period_start=None, period_end=None,
            answer="Câu hỏi nằm ngoài phạm vi tư vấn Thuế Thu nhập Doanh nghiệp (CIT).",
            citations=[]
        )

    if analysis.get("needs_clarification"):
        return ChatQueryResponse(
            scope_result="IN_SCOPE",
            answer_status="NEED_CLARIFICATION",
            period_start=None, period_end=None,
            answer=analysis.get("clarification_msg") or "Vui lòng cho biết giao dịch này phát sinh vào năm/kỳ tính thuế nào.",
            citations=[]
        )

    p_start = analysis.get("period_start") or "2024-01-01"
    p_end = analysis.get("period_end") or "2024-12-31"

    # 2. Truy xuất Temporal Vector từ Qdrant
    retrieved = TemporalRetriever.retrieve(req.question, p_start, p_end)

    # 3. Sinh câu trả lời có trích dẫn
    res = GroundedGenerator.generate_answer(req.question, retrieved, f"{p_start} đến {p_end}")

    return ChatQueryResponse(
        scope_result="IN_SCOPE",
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
        status="SUCCESS",
        content=result["content"],
        content_hash=result["content_hash"],
        has_unauthorized_numbers=result["has_unauthorized_numbers"],
        unauthorized_numbers=result["unauthorized_numbers"],
        citations=citations
    )
