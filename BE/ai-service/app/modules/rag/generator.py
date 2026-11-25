import re

from app.core.models import llm_model
from app.modules.rag.prompts import build_grounded_answer_prompt
from app.schemas.ai_results import GroundedAnswerSections
from app.schemas.answers import INSUFFICIENT_KNOWLEDGE_ANSWER
from app.schemas.statuses import AnswerStatus

_FENCE_RE = re.compile(r"```(?:json)?\s*([\s\S]*?)\s*```", re.IGNORECASE)
_SECTION_PREFIX_RE = re.compile(
    r"^(?:\*\*|###?\s*)?(?:1\.\s*|2\.\s*|3\.\s*)?"
    r"(?:dữ\s+kiện|căn\s+cứ(?:\s+pháp\s+lý(?:\s+trích\s+dẫn)?)?|kết\s+luận)"
    r"(?:\*\*)?\s*[:\-–]\s*",
    re.IGNORECASE,
)


def iso_date_only(value: str | None) -> str | None:
    if not value:
        return None
    clean = str(value).strip()
    return clean[:10] if len(clean) >= 10 else clean


def build_citations(retrieved_chunks: list, *, include_text: bool = True) -> list[dict]:
    """Build normalized legal citation dictionaries from Qdrant hit payloads."""
    citations = []
    for h in retrieved_chunks:
        p = h.payload or {}
        citation = {
            "legal_source_id": p.get("legal_source_id"),
            "document_number": p.get("document_number"),
            "doc_title": p.get("document_title") or p.get("doc_title"),
            "article": p.get("article"),
            "clause": p.get("clause"),
            "point": p.get("point"),
            "effective_from": iso_date_only(p.get("effective_from")),
            "effective_to": iso_date_only(p.get("effective_to")),
        }
        if include_text:
            citation["text"] = p.get("text_content")
        citations.append(citation)
    return citations


def _format_context_chunks(retrieved_chunks: list) -> str:
    """Format retrieved chunks with numbered citation metadata headers."""
    blocks: list[str] = []
    for idx, hit in enumerate(retrieved_chunks, start=1):
        payload = hit.payload or {}
        doc_no = payload.get("document_number")
        doc_title = payload.get("document_title") or payload.get("doc_title")
        ref_parts = [
            str(part).strip()
            for part in (
                doc_no,
                doc_title,
                payload.get("article"),
                payload.get("clause"),
                payload.get("point"),
            )
            if part and str(part).strip()
        ]
        header = f"[{idx}] " + (
            " | ".join(ref_parts) if ref_parts else "Căn cứ pháp lý"
        )
        text = str(payload.get("text_content") or "").strip()
        blocks.append(f"{header}\n{text}" if text else header)
    return "\n---\n".join(blocks)


def _strip_section_prefix(text: str) -> str:
    return _SECTION_PREFIX_RE.sub("", text.strip()).strip()


def _build_fallback_legal_basis(retrieved_chunks: list) -> str:
    lines: list[str] = []
    for idx, hit in enumerate(retrieved_chunks, start=1):
        payload = hit.payload or {}
        parts = [
            str(part).strip()
            for part in (
                payload.get("document_number"),
                payload.get("document_title") or payload.get("doc_title"),
                payload.get("article"),
                payload.get("clause"),
                payload.get("point"),
            )
            if part and str(part).strip()
        ]
        if parts:
            lines.append(f"[{idx}] " + ", ".join(parts) + ".")
    return "\n".join(lines) or "Căn cứ theo tài liệu pháp lý đã được phê duyệt trong kho tri thức [1]."


def _has_all_three_headings(text: str) -> bool:
    lowered = text.lower()
    pos_facts = lowered.find("dữ kiện")
    pos_basis = lowered.find("căn cứ")
    pos_conclusion = lowered.find("kết luận")
    return 0 <= pos_facts < pos_basis < pos_conclusion


def _format_three_part_answer(
    raw_content: str,
    question: str,
    retrieved_chunks: list,
    period_str: str,
) -> str:
    """Normalize LLM output into the required Dữ kiện / Căn cứ / Kết luận structure."""
    text = (raw_content or "").strip()
    fenced = _FENCE_RE.fullmatch(text)
    candidate = fenced.group(1).strip() if fenced else text
    if not candidate.startswith("{"):
        start = candidate.find("{")
        end = candidate.rfind("}")
        if 0 <= start < end:
            candidate = candidate[start : end + 1]

    try:
        parsed = GroundedAnswerSections.model_validate_json(candidate)
        facts = _strip_section_prefix(parsed.facts) or (
            f"Người dùng tra cứu quy định thuế TNDN cho kỳ tính thuế {period_str}: {question.strip()}"
        )
        legal_basis = _strip_section_prefix(parsed.legal_basis) or _build_fallback_legal_basis(
            retrieved_chunks
        )
        conclusion = _strip_section_prefix(parsed.conclusion)
        if conclusion:
            return f"Dữ kiện:\n{facts}\n\nCăn cứ:\n{legal_basis}\n\nKết luận:\n{conclusion}"
    except Exception:
        pass

    if _has_all_three_headings(text):
        return text

    fallback_facts = (
        f"Người dùng tra cứu quy định thuế TNDN cho kỳ tính thuế {period_str}: {question.strip()}"
    )
    fallback_basis = _build_fallback_legal_basis(retrieved_chunks)
    fallback_conclusion = _strip_section_prefix(text) or text
    return (
        f"Dữ kiện:\n{fallback_facts}\n\n"
        f"Căn cứ:\n{fallback_basis}\n\n"
        f"Kết luận:\n{fallback_conclusion}"
    )


class GroundedGenerator:
    @staticmethod
    def generate_answer(question: str, retrieved_chunks: list, period_str: str) -> dict:
        # Step 5: Retrieval Sufficiency Check
        if not retrieved_chunks:
            return {
                "answer_status": AnswerStatus.REJECTED,
                "answer": INSUFFICIENT_KNOWLEDGE_ANSWER,
                "citations": [],
            }

        context = _format_context_chunks(retrieved_chunks)

        prompt = build_grounded_answer_prompt(
            question=question,
            context=context,
            period_str=period_str,
        )
        res = llm_model.invoke(prompt)
        formatted_answer = _format_three_part_answer(
            raw_content=str(res.content or ""),
            question=question,
            retrieved_chunks=retrieved_chunks,
            period_str=period_str,
        )

        return {
            "answer_status": AnswerStatus.ANSWERED,
            "answer": formatted_answer,
            "citations": build_citations(retrieved_chunks, include_text=True),
        }
