import re

from qdrant_client.models import (
    DatetimeRange,
    FieldCondition,
    Filter,
    IsEmptyCondition,
    IsNullCondition,
    MatchValue,
    PayloadField,
)

from app.config import settings
from app.core.models import embedding_model
from app.core.qdrant import qdrant_client, to_rfc3339
from app.core.text_utils import strip_vietnamese_accents
from app.modules.rag.cit_calculator import CALC_INTENT_KEYWORDS, CALCULATION_QUESTION_RE
from app.schemas.statuses import DocumentStatus

_BASE_SCORE_FLOOR = 0.44
_DEFAULT_SCORE_THRESHOLD = 0.50
# One long decree must not fill every context slot and push out the rule the question needs.
_MAX_CHUNKS_PER_DOCUMENT = 4
_RATE_CLAUSE_QUERY = (
    "thuế suất thuế thu nhập doanh nghiệp 20% doanh nghiệp có tổng doanh thu năm "
    "không quá 03 tỷ đồng 15% từ trên 03 tỷ đồng đến không quá 50 tỷ đồng 17%"
)
_RATE_QUESTION_RE = re.compile(r"\bthuế\s+suất\b|\bthue\s+suat\b", re.IGNORECASE)
_MAX_RATE_CLAUSES = 2

_QUESTION_NOISE_SUFFIX_RE = re.compile(
    r"(?:\b(?:có\s+đúng\s+không|đúng\s+hay\s+sai|đúng\s+không|phải\s+không|hay\s+không"
    r"|co\s+dung\s+khong|dung\s+hay\s+sai|dung\s+khong|phai\s+khong)\b|[?!])+",
    re.IGNORECASE,
)
_UNACCENTED_TERM_EXPANSIONS = (
    ("thue suat", "thuế suất thuế thu nhập doanh nghiệp"),
    ("duoc tru", "khoản chi được trừ không được trừ"),
    ("khong duoc tru", "khoản chi không được trừ"),
    ("khau hao", "khấu hao tài sản cố định"),
    ("chuyen lo", "chuyển lỗ bù trừ lỗ"),
    ("bu tru", "bù trừ lỗ"),
    ("huu tri", "hưu trí tự nguyện"),
    ("phuc loi", "chi phúc lợi"),
    ("tien phat", "tiền phạt vi phạm hành chính"),
    ("lai vay", "chi phí lãi vay giao dịch liên kết"),
    ("cham nop", "tiền chậm nộp"),
    ("quyet toan", "quyết toán thuế"),
    ("tam nop", "tạm nộp thuế theo quý"),
    ("giam 30%", "giảm 30% số thuế phải nộp"),
)

_CIT_DOMAIN_PHRASES = (
    "không được trừ",
    "được trừ",
    "thuế suất",
    "thu nhập tính thuế",
    "thu nhập chịu thuế",
    "chuyển lỗ",
    "bù trừ lỗ",
    "bất động sản",
    "khấu hao",
    "hưu trí tự nguyện",
    "phúc lợi",
    "vi phạm hành chính",
    "tiền phạt",
    "lãi vay",
    "giao dịch liên kết",
    "tiền chậm nộp",
    "tỷ lệ % trên doanh thu",
    "không xác định được chi phí",
    "quyết toán thuế",
)
_ADMINISTRATION_QUERY_KEYWORDS = (
    "chậm nộp",
    "hạn nộp",
    "thời hạn nộp",
    "gia hạn",
    "hồ sơ khai thuế",
    "quyết toán",
    "tạm nộp",
    "ấn định thuế",
    "kiểm tra thuế",
    "thanh tra thuế",
)
_SUBSTANTIVE_CIT_DOC_PREFIXES = (
    "67/2025",
    "320/2025",
    "20/2026",
    "141/2026",
    "398/2026",
    "09/2026",
    "255/2026",
)
_STOPWORDS = {
    "thuế",
    "tndn",
    "doanh",
    "nghiệp",
    "năm",
    "quý",
    "tháng",
    "kỳ",
    "tính",
    "bao",
    "nhiêu",
    "như",
    "thế",
    "nào",
    "đúng",
    "không",
    "phải",
    "theo",
    "quy",
    "định",
    "của",
    "cho",
    "khi",
    "với",
    "các",
    "mức",
}


def _prepare_search_query(query: str) -> str:
    """Strip true/false boilerplate (Task #12) and expand unaccented CIT terms (F01, F02, F05)."""
    cleaned = _QUESTION_NOISE_SUFFIX_RE.sub(" ", query or "")
    cleaned = " ".join(cleaned.split()).strip() or (query or "").strip()
    ascii_lower = strip_vietnamese_accents(cleaned).lower()
    if ascii_lower == cleaned.lower():
        expansions = [
            accented
            for ascii_kw, accented in _UNACCENTED_TERM_EXPANSIONS
            if ascii_kw in ascii_lower
        ]
        if not expansions and "tndn" in ascii_lower:
            expansions.append("thuế thu nhập doanh nghiệp")
        if expansions:
            return f"{cleaned} ({' '.join(expansions)})"
    return cleaned


def _extract_query_tokens(normalized_query: str) -> list[str]:
    words = re.findall(r"[a-zà-ỹ]{3,}", normalized_query)
    return list(dict.fromkeys(w for w in words if w not in _STOPWORDS))


def _rerank_hits(query: str, hits: list, limit: int) -> list:
    """Combine vector similarity with CIT phrase overlap so large admin docs do not drown core CIT rules."""
    if not hits:
        return []

    normalized_query = " ".join((query or "").lower().split())
    ascii_query = strip_vietnamese_accents(normalized_query)
    matched_phrases = [
        p
        for p in _CIT_DOMAIN_PHRASES
        if p in normalized_query or strip_vietnamese_accents(p) in ascii_query
    ]
    asks_deductibility = "được trừ" in normalized_query or "duoc tru" in ascii_query
    is_admin_query = any(
        kw in normalized_query or strip_vietnamese_accents(kw) in ascii_query
        for kw in _ADMINISTRATION_QUERY_KEYWORDS
    )
    query_tokens = _extract_query_tokens(normalized_query)

    scored_hits: list[tuple[float, int, object]] = []
    for idx, hit in enumerate(hits):
        payload = getattr(hit, "payload", None) or {}
        raw_score = getattr(hit, "score", None)
        base_score = float(raw_score) if raw_score is not None else 1.0

        doc_no = str(payload.get("document_number") or "").lower()
        chunk_text = " ".join(
            str(payload.get(k) or "")
            for k in ("article", "clause", "point", "text_content")
        ).lower()

        bonus = 0.0
        for phrase in matched_phrases:
            if phrase in chunk_text:
                bonus += 0.04
        if asks_deductibility and (
            "khoản chi được trừ" in chunk_text
            or "khoản chi không được trừ" in chunk_text
            or "chi phí được trừ" in chunk_text
            or "không tính vào chi phí được trừ" in chunk_text
        ):
            bonus += 0.08

        if query_tokens:
            token_hits = sum(1 for tok in query_tokens if tok in chunk_text)
            bonus += min(token_hits * 0.01, 0.05)

        if not is_admin_query and any(
            doc_no.startswith(prefix) for prefix in _SUBSTANTIVE_CIT_DOC_PREFIXES
        ):
            bonus += 0.06

        adjusted_score = base_score + min(bonus, 0.30)
        if raw_score is not None and base_score < _DEFAULT_SCORE_THRESHOLD and bonus < 0.04:
            continue
        scored_hits.append((adjusted_score, -idx, hit))

    scored_hits.sort(reverse=True)
    return _cap_hits_per_document([hit for _, _, hit in scored_hits], limit)


def _cap_hits_per_document(ranked_hits: list, limit: int) -> list:
    """Keep rank order but take at most a few chunks per document, then refill from the rest if slots remain."""
    picked: list = []
    overflow: list = []
    per_doc: dict[str, int] = {}
    for hit in ranked_hits:
        doc_no = str((getattr(hit, "payload", None) or {}).get("document_number") or "").lower()
        if doc_no and per_doc.get(doc_no, 0) >= _MAX_CHUNKS_PER_DOCUMENT:
            overflow.append(hit)
            continue
        per_doc[doc_no] = per_doc.get(doc_no, 0) + 1
        picked.append(hit)
        if len(picked) >= limit:
            return picked
    return picked + overflow[: limit - len(picked)]


def _has_rate_brackets(hits: list) -> bool:
    text = " ".join(str((getattr(h, "payload", None) or {}).get("text_content") or "") for h in hits).lower()
    return "20%" in text and ("15%" in text or "17%" in text)


def needs_rate_clauses(question: str, hits: list) -> bool:
    """A rate or tax-amount question needs the statutory rate clause even when retrieval missed it."""
    q_norm = " ".join((question or "").lower().split())
    asks_rate = bool(_RATE_QUESTION_RE.search(q_norm))
    asks_amount = bool(CALCULATION_QUESTION_RE.search(q_norm)) and any(kw in q_norm for kw in CALC_INTENT_KEYWORDS)
    return (asks_rate or asks_amount) and not _has_rate_brackets(hits)


class TemporalRetriever:
    @staticmethod
    def retrieve(query: str, period_start: str, period_end: str, limit: int = 10):
        effective_query = _prepare_search_query(query)
        hits = TemporalRetriever._search(effective_query, period_start, period_end, max(limit * 3, 30))
        return _rerank_hits(effective_query, hits, limit)

    @staticmethod
    def retrieve_for_chat(question: str, period_start: str, period_end: str, limit: int = 10):
        """Retrieve for a chat question and append the statutory rate clause when the question needs it."""
        hits = TemporalRetriever.retrieve(question, period_start, period_end, limit)
        if not needs_rate_clauses(question, hits):
            return hits
        seen = {getattr(h, "id", None) for h in hits}
        extra = [
            h
            for h in TemporalRetriever._search(_RATE_CLAUSE_QUERY, period_start, period_end, 10)
            if getattr(h, "id", None) not in seen
            and "%" in str((getattr(h, "payload", None) or {}).get("text_content") or "")
        ]
        return hits + extra[:_MAX_RATE_CLAUSES]

    @staticmethod
    def _search(effective_query: str, period_start: str, period_end: str, candidate_limit: int) -> list:
        query_vector = embedding_model.embed_query(effective_query)

        rfc_start = to_rfc3339(period_start, is_end=False)
        rfc_end = to_rfc3339(period_end, is_end=True)

        # Temporal RAG filter:
        # 1. status = APPROVED
        # 2. effective_from <= tax period end
        # 3. (effective_to >= tax period start OR still in effect: null/empty)
        temporal_filter = Filter(
            must=[
                FieldCondition(
                    key="status", match=MatchValue(value=DocumentStatus.APPROVED)
                ),
                FieldCondition(key="effective_from", range=DatetimeRange(lte=rfc_end)),
                Filter(
                    should=[
                        FieldCondition(
                            key="effective_to", range=DatetimeRange(gte=rfc_start)
                        ),
                        IsEmptyCondition(is_empty=PayloadField(key="effective_to")),
                        IsNullCondition(is_null=PayloadField(key="effective_to")),
                    ]
                ),
            ],
        )

        if hasattr(qdrant_client, "search"):
            hits = qdrant_client.search(
                collection_name=settings.QDRANT_COLLECTION,
                query_vector=query_vector,
                query_filter=temporal_filter,
                limit=candidate_limit,
                score_threshold=_BASE_SCORE_FLOOR,
            )
            return list(hits)

        response = qdrant_client.query_points(
            collection_name=settings.QDRANT_COLLECTION,
            query=query_vector,
            query_filter=temporal_filter,
            limit=candidate_limit,
            score_threshold=_BASE_SCORE_FLOOR,
        )
        return list(response.points)
