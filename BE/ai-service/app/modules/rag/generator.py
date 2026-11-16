from app.core.models import llm_model
from app.modules.rag.prompts import build_grounded_answer_prompt
from app.schemas.answers import INSUFFICIENT_KNOWLEDGE_ANSWER
from app.schemas.statuses import AnswerStatus


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

        context = "\n---\n".join([h.payload["text_content"] for h in retrieved_chunks])

        prompt = build_grounded_answer_prompt(
            question=question,
            context=context,
            period_str=period_str,
        )
        res = llm_model.invoke(prompt)

        return {
            "answer_status": AnswerStatus.ANSWERED,
            "answer": res.content,
            "citations": build_citations(retrieved_chunks, include_text=True),
        }
