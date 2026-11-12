from app.core.models import llm_model
from app.modules.rag.prompts import build_grounded_answer_prompt
from app.schemas.answers import INSUFFICIENT_KNOWLEDGE_ANSWER
from app.schemas.statuses import AnswerStatus


def _iso_date_only(value: str | None) -> str | None:
    if not value:
        return None
    clean = str(value).strip()
    return clean[:10] if len(clean) >= 10 else clean


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

        # Normalize citations returned to .NET
        citations = []
        for h in retrieved_chunks:
            p = h.payload or {}
            citations.append(
                {
                    "legal_source_id": p.get("legal_source_id"),
                    "document_number": p.get("document_number"),
                    "doc_title": p.get("document_title") or p.get("doc_title"),
                    "article": p.get("article"),
                    "clause": p.get("clause"),
                    "point": p.get("point"),
                    "text": p.get("text_content"),
                    "effective_from": _iso_date_only(p.get("effective_from")),
                    "effective_to": _iso_date_only(p.get("effective_to")),
                }
            )

        return {
            "answer_status": AnswerStatus.ANSWERED,
            "answer": res.content,
            "citations": citations,
        }
