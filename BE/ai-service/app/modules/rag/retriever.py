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
from app.schemas.statuses import DocumentStatus

_BASE_SCORE_FLOOR = 0.44
_DEFAULT_SCORE_THRESHOLD = 0.50

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
    return [hit for _, _, hit in scored_hits[:limit]]


class TemporalRetriever:
    @staticmethod
    def retrieve(query: str, period_start: str, period_end: str, limit: int = 10):
        effective_query = _prepare_search_query(query)
        query_vector = embedding_model.embed_query(effective_query)
        candidate_limit = max(limit * 3, 30)

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
            return _rerank_hits(effective_query, hits, limit)

        response = qdrant_client.query_points(
            collection_name=settings.QDRANT_COLLECTION,
            query=query_vector,
            query_filter=temporal_filter,
            limit=candidate_limit,
            score_threshold=_BASE_SCORE_FLOOR,
        )
        return _rerank_hits(effective_query, response.points, limit)
