from dataclasses import dataclass, field
import json
import logging
import re
import time

from app.core.legal_refs import extract_document_numbers
from app.core.models import llm_model
from app.modules.rag.cit_calculator import (
    compute_chat_cit_hint,
    detect_missing_case_clarification,
)
from app.modules.rag.guardrails import (
    CITATION_MARKER_RE,
    allowed_document_numbers_from_chunks,
    drops_critical_condition,
    find_ungrounded_numbers,
    has_reversed_cap_polarity,
    missing_verified_tax_note,
)
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
_CLEAN_QUESTION_CLARIFICATION_RE = re.compile(
    r"(?:^|\n)\s*Clarification:\s*.+$", re.IGNORECASE | re.DOTALL
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


def format_context_chunks(retrieved_chunks: list) -> str:
    """Format retrieved chunks with numbered citation metadata headers for RAG and Drafting."""
    blocks: list[str] = []
    for idx, hit in enumerate(retrieved_chunks, start=1):
        payload = hit.payload or {}
        ref_parts = [
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
        header = f"[{idx}] " + (" | ".join(ref_parts) if ref_parts else "Căn cứ pháp lý")
        text = str(payload.get("text_content") or "").strip()
        blocks.append(f"{header}\n{text}" if text else header)
    return "\n---\n".join(blocks)


def _build_canonical_legal_basis(used_chunks: list) -> str:
    lines: list[str] = []
    for idx, hit in enumerate(used_chunks, start=1):
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
    return 0 <= lowered.find("dữ kiện") < lowered.find("căn cứ") < lowered.find("kết luận")


@dataclass
class _ModelAnswer:
    answerable: bool | None = None
    used_sources: set[int] = field(default_factory=set)
    conclusion: str = ""
    plain_text: str | None = None

    def body_text(self) -> str:
        return self.plain_text if self.plain_text is not None else self.conclusion


def _coerce_text(value) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, dict):
        return "\n".join(text for text in (_coerce_text(v) for v in value.values()) if text)
    if isinstance(value, list):
        return "\n".join(text for text in (_coerce_text(v) for v in value) if text)
    return str(value).strip()


def _parse_model_answer(raw_content: str) -> _ModelAnswer | None:
    """Parse the LLM reply; return None for malformed JSON that must not be shown verbatim."""
    text = (raw_content or "").strip()
    fenced = _FENCE_RE.fullmatch(text)
    candidate = fenced.group(1).strip() if fenced else text
    if not candidate.startswith("{"):
        start, end = candidate.find("{"), candidate.rfind("}")
        candidate = candidate[start : end + 1] if 0 <= start < end else ""
    if candidate.startswith("{"):
        try:
            data = json.loads(candidate)
            if isinstance(data, dict):
                raw_ans = data.get("answerable")
                answerable = (
                    raw_ans
                    if isinstance(raw_ans, bool)
                    else (raw_ans.strip().lower() == "true" if isinstance(raw_ans, str) and raw_ans.strip().lower() in ("true", "false") else None)
                )
                raw_sources = data.get("used_sources") if isinstance(data.get("used_sources"), list) else []
                used_sources = {
                    int(s) for item in raw_sources if (s := str(item).strip().strip("[]")).isdigit()
                }
                conclusion = _SECTION_PREFIX_RE.sub("", _coerce_text(data.get("conclusion"))).strip()
                return _ModelAnswer(answerable=answerable, used_sources=used_sources, conclusion=conclusion)
        except ValueError:
            pass
    if "{" in text and '"conclusion"' in text:
        return None
    return _ModelAnswer(plain_text=text) if text else None


def _renumber_markers(text: str, mapping: dict[int, int]) -> str:
    return CITATION_MARKER_RE.sub(
        lambda m: f"[{mapping[int(m.group(1))]}]" if int(m.group(1)) in mapping else m.group(0),
        text,
    )


def _format_three_part_answer(answer: _ModelAnswer, question: str, used_chunks: list, period_str: str) -> str:
    clean_q = " ".join(_CLEAN_QUESTION_CLARIFICATION_RE.sub("", question or "").split())
    facts = f"Câu hỏi tra cứu (kỳ tính thuế {period_str}): {clean_q}"
    legal_basis = _build_canonical_legal_basis(used_chunks)
    if answer.plain_text is not None:
        if _has_all_three_headings(answer.plain_text):
            return answer.plain_text
        conclusion = _SECTION_PREFIX_RE.sub("", answer.plain_text).strip() or answer.plain_text
        return f"Dữ kiện:\n{facts}\n\nCăn cứ:\n{legal_basis}\n\nKết luận:\n{conclusion}"
    return f"Dữ kiện:\n{facts}\n\nCăn cứ:\n{legal_basis}\n\nKết luận:\n{answer.conclusion}"


def _outcome(status: AnswerStatus, answer: str, citations: list | None = None) -> dict:
    return {"answer_status": status, "answer": answer, "citations": citations or []}


class GroundedGenerator:
    @staticmethod
    def generate_answer(
        question: str,
        retrieved_chunks: list,
        period_str: str,
        *,
        deadline: float | None = None,
    ) -> dict:
        if not retrieved_chunks:
            return _outcome(AnswerStatus.REJECTED, INSUFFICIENT_KNOWLEDGE_ANSWER)

        if clarification_msg := detect_missing_case_clarification(question, retrieved_chunks):
            return _outcome(AnswerStatus.NEED_CLARIFICATION, clarification_msg)

        context = format_context_chunks(retrieved_chunks)
        source_count = len(retrieved_chunks)
        scores = [round(float(getattr(hit, "score", 0) or 0), 3) for hit in retrieved_chunks]
        calc_hint = compute_chat_cit_hint(question, retrieved_chunks)
        retry_note: str | None = None

        for attempt in range(2):
            if deadline is not None and time.monotonic() >= deadline:
                raise TimeoutError("Chat generation deadline exceeded.")

            prompt = build_grounded_answer_prompt(
                question=question,
                context=context,
                period_str=period_str,
                retry_note=retry_note,
                calc_hint_block=calc_hint.prompt_block if calc_hint else None,
            )
            res = llm_model.invoke(prompt)
            answer = _parse_model_answer(str(res.content or ""))

            if answer is None or answer.answerable is False:
                logger.info("Chat answer rejected: not answerable (scores=%s)", scores)
                return _outcome(AnswerStatus.REJECTED, UNSUPPORTED_QUESTION_ANSWER)
            if answer.plain_text is None and not answer.conclusion:
                logger.info("Chat answer rejected: empty conclusion (scores=%s)", scores)
                return _outcome(AnswerStatus.REJECTED, UNSUPPORTED_QUESTION_ANSWER)

            conclusion_text = answer.body_text()
            referenced = {int(m) for m in CITATION_MARKER_RE.findall(conclusion_text)}
            if any(not 1 <= idx <= source_count for idx in referenced):
                logger.info("Chat answer rejected: marker outside sources %s", sorted(referenced))
                return _outcome(AnswerStatus.REJECTED, UNSUPPORTED_QUESTION_ANSWER)

            used = referenced or {idx for idx in answer.used_sources if 1 <= idx <= source_count}
            if not used:
                logger.info("Chat answer rejected: no used sources (scores=%s)", scores)
                return _outcome(AnswerStatus.REJECTED, UNSUPPORTED_QUESTION_ANSWER)
            used_indexes = sorted(used)
            used_chunks = [retrieved_chunks[idx - 1] for idx in used_indexes]

            fabricated = sorted(
                extract_document_numbers(conclusion_text) - allowed_document_numbers_from_chunks(used_chunks)
            )
            if fabricated:
                logger.info("Chat answer mentions unknown documents %s (attempt %d)", fabricated, attempt + 1)
                retry_note = (
                    "Câu trả lời trước nêu số hiệu văn bản không có trong các đoạn căn cứ đã dùng: "
                    + ", ".join(fabricated)
                    + ". Chỉ được nêu số hiệu văn bản xuất hiện trong các đoạn Căn cứ pháp lý đã chọn; "
                    "không gán quy định cho văn bản chỉ xuất hiện trong câu hỏi. Nếu căn cứ không đủ thì đặt answerable = false."
                )
                continue

            ungrounded_figures = find_ungrounded_numbers(
                question, conclusion_text, used_chunks, period_str=period_str, calc_hint=calc_hint
            )
            if ungrounded_figures:
                logger.info("Chat answer mentions ungrounded figures %s (attempt %d)", ungrounded_figures, attempt + 1)
                retry_note = (
                    "Kết luận trước chứa con số, tỷ lệ hoặc thời hạn không có trong các đoạn căn cứ đã dùng: "
                    + ", ".join(ungrounded_figures)
                    + ". Hãy bỏ mọi con số/thời hạn không có trong đoạn căn cứ (hoặc đặt answerable = false nếu căn cứ không đủ)."
                )
                continue

            if tax_note := missing_verified_tax_note(conclusion_text, calc_hint):
                logger.info("Chat answer omitted verified tax amount (attempt %d)", attempt + 1)
                retry_note = tax_note
                continue

            if has_reversed_cap_polarity(conclusion_text, used_chunks):
                logger.info("Chat answer reversed non-deductible cap polarity (attempt %d)", attempt + 1)
                retry_note = (
                    "Kết luận trước đảo ngược nghĩa của quy định mức trần: phần chi hoặc khấu hao VƯỢT mức trần "
                    "trong đoạn căn cứ là KHÔNG được trừ (không tính vào chi phí được trừ). "
                    "Hãy viết lại đúng nguyên văn quy định và bỏ câu phụ dư thừa."
                )
                continue

            if condition_note := drops_critical_condition(question, conclusion_text, used_chunks):
                logger.info("Chat answer dropped eligibility condition (attempt %d)", attempt + 1)
                retry_note = condition_note
                continue

            mapping = {old: new for new, old in enumerate(used_indexes, start=1)}
            answer.conclusion = _renumber_markers(answer.conclusion, mapping)
            if answer.plain_text is not None:
                answer.plain_text = _renumber_markers(answer.plain_text, mapping)
            logger.info("Chat answer accepted: used=%s scores=%s", used_indexes, scores)

            return _outcome(
                AnswerStatus.ANSWERED,
                _format_three_part_answer(answer, question, used_chunks, period_str),
                build_citations(used_chunks, include_text=True),
            )

        return _outcome(AnswerStatus.REJECTED, UNSUPPORTED_QUESTION_ANSWER)
