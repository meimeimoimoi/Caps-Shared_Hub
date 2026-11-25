from dataclasses import dataclass, field
import json
import logging
import re

from app.core.legal_refs import extract_document_numbers
from app.core.models import llm_model
from app.modules.rag.prompts import build_grounded_answer_prompt
from app.schemas.answers import INSUFFICIENT_KNOWLEDGE_ANSWER, UNSUPPORTED_QUESTION_ANSWER
from app.schemas.statuses import AnswerStatus

logger = logging.getLogger(__name__)

_FENCE_RE = re.compile(r"```(?:json)?\s*([\s\S]*?)\s*```", re.IGNORECASE)
_SECTION_PREFIX_RE = re.compile(
    r"^(?:\*\*|###?\s*)?(?:1\.\s*|2\.\s*|3\.\s*)?"
    r"(?:dữ\s+kiện|căn\s+cứ(?:\s+pháp\s+lý(?:\s+trích\s+dẫn)?)?|kết\s+luận)"
    r"(?:\*\*)?\s*[:\-–]\s*",
    re.IGNORECASE,
)
_CITATION_MARKER_RE = re.compile(r"\[(\d{1,3})\]")


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


@dataclass
class _ModelAnswer:
    """LLM output normalized from JSON (structured) or plain text."""

    answerable: bool | None = None
    used_sources: set[int] = field(default_factory=set)
    facts: str = ""
    legal_basis: str = ""
    conclusion: str = ""
    plain_text: str | None = None

    def texts(self) -> list[str]:
        if self.plain_text is not None:
            return [self.plain_text]
        return [self.facts, self.legal_basis, self.conclusion]


def _coerce_text(value) -> str:
    """Flatten nested JSON values into plain text so raw JSON never reaches the user."""
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, dict):
        return "\n".join(text for text in (_coerce_text(v) for v in value.values()) if text)
    if isinstance(value, list):
        return "\n".join(text for text in (_coerce_text(v) for v in value) if text)
    return str(value).strip()


def _coerce_bool(value) -> bool | None:
    if isinstance(value, bool):
        return value
    if isinstance(value, str) and value.strip().lower() in ("true", "false"):
        return value.strip().lower() == "true"
    return None


def _coerce_source_indexes(value) -> set[int]:
    if not isinstance(value, list):
        return set()
    indexes: set[int] = set()
    for item in value:
        text = str(item).strip().strip("[]")
        if text.isdigit():
            indexes.add(int(text))
    return indexes


def _extract_json_object(text: str) -> dict | None:
    fenced = _FENCE_RE.fullmatch(text)
    candidate = fenced.group(1).strip() if fenced else text
    if not candidate.startswith("{"):
        start = candidate.find("{")
        end = candidate.rfind("}")
        if not 0 <= start < end:
            return None
        candidate = candidate[start : end + 1]
    try:
        data = json.loads(candidate)
    except ValueError:
        return None
    return data if isinstance(data, dict) else None


def _parse_model_answer(raw_content: str) -> _ModelAnswer | None:
    """Parse the LLM reply; return None for malformed JSON that must not be shown verbatim."""
    text = (raw_content or "").strip()
    data = _extract_json_object(text)
    if data is not None:
        return _ModelAnswer(
            answerable=_coerce_bool(data.get("answerable")),
            used_sources=_coerce_source_indexes(data.get("used_sources")),
            facts=_strip_section_prefix(_coerce_text(data.get("facts"))),
            legal_basis=_strip_section_prefix(_coerce_text(data.get("legal_basis"))),
            conclusion=_strip_section_prefix(_coerce_text(data.get("conclusion"))),
        )
    if "{" in text and '"conclusion"' in text:
        return None
    return _ModelAnswer(plain_text=text) if text else None


def _referenced_indexes(texts: list[str]) -> set[int]:
    return {int(m) for text in texts for m in _CITATION_MARKER_RE.findall(text or "")}


def _renumber_markers(text: str, mapping: dict[int, int]) -> str:
    def replace(match: re.Match) -> str:
        new_index = mapping.get(int(match.group(1)))
        return f"[{new_index}]" if new_index else match.group(0)

    return _CITATION_MARKER_RE.sub(replace, text)


def _allowed_document_numbers(question: str, used_chunks: list) -> set[str]:
    allowed = extract_document_numbers(question)
    for hit in used_chunks:
        payload = hit.payload or {}
        for key in ("document_number", "document_title", "doc_title", "text_content"):
            allowed |= extract_document_numbers(str(payload.get(key) or ""))
    return allowed


def _format_three_part_answer(
    answer: _ModelAnswer,
    question: str,
    used_chunks: list,
    period_str: str,
) -> str:
    """Render the Dữ kiện / Căn cứ / Kết luận structure from a validated answer."""
    default_facts = (
        f"Người dùng tra cứu quy định thuế TNDN cho kỳ tính thuế {period_str}: {question.strip()}"
    )
    if answer.plain_text is not None:
        if _has_all_three_headings(answer.plain_text):
            return answer.plain_text
        conclusion = _strip_section_prefix(answer.plain_text) or answer.plain_text
        return (
            f"Dữ kiện:\n{default_facts}\n\n"
            f"Căn cứ:\n{_build_fallback_legal_basis(used_chunks)}\n\n"
            f"Kết luận:\n{conclusion}"
        )
    facts = answer.facts or default_facts
    legal_basis = answer.legal_basis or _build_fallback_legal_basis(used_chunks)
    return f"Dữ kiện:\n{facts}\n\nCăn cứ:\n{legal_basis}\n\nKết luận:\n{answer.conclusion}"


def _rejected(answer: str) -> dict:
    return {"answer_status": AnswerStatus.REJECTED, "answer": answer, "citations": []}


class GroundedGenerator:
    @staticmethod
    def generate_answer(question: str, retrieved_chunks: list, period_str: str) -> dict:
        # Step 5: Retrieval Sufficiency Check
        if not retrieved_chunks:
            return _rejected(INSUFFICIENT_KNOWLEDGE_ANSWER)

        context = _format_context_chunks(retrieved_chunks)
        source_count = len(retrieved_chunks)
        # Logged so the retriever score threshold can be calibrated from real queries.
        scores = [round(float(getattr(hit, "score", 0) or 0), 3) for hit in retrieved_chunks]
        retry_note: str | None = None

        # One retry is allowed when the answer mentions legal documents outside the used sources.
        for attempt in range(2):
            prompt = build_grounded_answer_prompt(
                question=question,
                context=context,
                period_str=period_str,
                retry_note=retry_note,
            )
            res = llm_model.invoke(prompt)
            answer = _parse_model_answer(str(res.content or ""))

            # Step 6: the sources must directly answer the question (BR-C10, BR-C13).
            if answer is None or answer.answerable is False:
                logger.info("Chat answer rejected: not answerable (scores=%s)", scores)
                return _rejected(UNSUPPORTED_QUESTION_ANSWER)
            if answer.plain_text is None and not answer.conclusion:
                logger.info("Chat answer rejected: empty conclusion (scores=%s)", scores)
                return _rejected(UNSUPPORTED_QUESTION_ANSWER)

            # Step 7: cite only the sources actually used; markers must point at retrieved chunks.
            referenced = _referenced_indexes(answer.texts())
            if any(not 1 <= idx <= source_count for idx in referenced):
                logger.info("Chat answer rejected: marker outside sources %s", sorted(referenced))
                return _rejected(UNSUPPORTED_QUESTION_ANSWER)
            used = referenced or {idx for idx in answer.used_sources if 1 <= idx <= source_count}
            if not used:
                logger.info("Chat answer rejected: no used sources (scores=%s)", scores)
                return _rejected(UNSUPPORTED_QUESTION_ANSWER)
            used_indexes = sorted(used)
            used_chunks = [retrieved_chunks[idx - 1] for idx in used_indexes]

            # Step 8: every legal document number must exist in the used sources (BR-C14).
            mentioned = set().union(*(extract_document_numbers(text) for text in answer.texts()))
            fabricated = sorted(mentioned - _allowed_document_numbers(question, used_chunks))
            if fabricated:
                logger.info(
                    "Chat answer mentions unknown documents %s (attempt %d)", fabricated, attempt + 1
                )
                retry_note = (
                    "Câu trả lời trước nêu số hiệu văn bản không có trong các đoạn căn cứ đã dùng: "
                    + ", ".join(fabricated)
                    + ". Chỉ được nêu số hiệu văn bản xuất hiện trong Căn cứ pháp lý truy xuất; "
                    "nếu căn cứ không đủ thì đặt answerable = false."
                )
                continue

            # Renumber markers so [n] in the answer matches the filtered citation list.
            mapping = {old: new for new, old in enumerate(used_indexes, start=1)}
            answer.facts = _renumber_markers(answer.facts, mapping)
            answer.legal_basis = _renumber_markers(answer.legal_basis, mapping)
            answer.conclusion = _renumber_markers(answer.conclusion, mapping)
            if answer.plain_text is not None:
                answer.plain_text = _renumber_markers(answer.plain_text, mapping)
            logger.info("Chat answer accepted: used=%s scores=%s", used_indexes, scores)

            return {
                "answer_status": AnswerStatus.ANSWERED,
                "answer": _format_three_part_answer(answer, question, used_chunks, period_str),
                "citations": build_citations(used_chunks, include_text=True),
            }

        return _rejected(UNSUPPORTED_QUESTION_ANSWER)
