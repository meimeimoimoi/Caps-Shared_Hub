import logging
import math
import os
import re
import threading

from qdrant_client.models import (
    DatetimeRange,
    FieldCondition,
    Filter,
    IsEmptyCondition,
    IsNullCondition,
    MatchValue,
    PayloadField,
)
from rank_bm25 import BM25Plus

from app.config import settings
from app.core.models import embedding_model
from app.core.qdrant import qdrant_client, to_rfc3339
from app.core.text_utils import strip_vietnamese_accents
from app.modules.rag.cit_calculator import CALC_INTENT_KEYWORDS, CALCULATION_QUESTION_RE
from app.schemas.statuses import DocumentStatus

logger = logging.getLogger(__name__)

# Wide dense recall floor so situational questions (~0.32-0.48 cosine) reach the reranker.
_BASE_SCORE_FLOOR = 0.30
_RERANK_MIN_PROB = 0.05
_MAX_CHUNKS_PER_DOCUMENT = 4
_DEFAULT_LIMIT = 6
_RERANK_SHORTLIST_SIZE = 10
_RRF_K = 60

# Concept-only query for locating the active period's tax-rate article without hardcoding rates or amounts.
_RATE_CLAUSE_QUERY = (
    "Điều quy định về thuế suất thuế thu nhập doanh nghiệp mức thuế suất chung "
    "và mức thuế suất áp dụng theo tổng doanh thu năm"
)
_RATE_QUESTION_RE = re.compile(r"\bthuế\s+suất\b|\bthue\s+suat\b", re.IGNORECASE)
_PREFERENTIAL_RATE_RE = re.compile(
    r"\bưu\s+đãi\b|\buu\s+dai\b|\bmiễn\s+giảm\b|\bmien\s+giam\b",
    re.IGNORECASE,
)
_DEDUCTIBILITY_ONLY_RE = re.compile(r"\bđược\s+trừ\b|\bduoc\s+tru\b", re.IGNORECASE)
_EXPLICIT_PAYABLE_RE = re.compile(
    r"\bphải\s+nộp\b|\bnộp\s+bao\s+nhiêu\b|\bsố\s+thuế\s+tndn\b|\bsố\s+thuế\s+thu\s+nhập\b",
    re.IGNORECASE,
)
_MAX_RATE_CLAUSES = 3

# Conversational confirmation suffixes that dilute semantic similarity on True/False questions.
_QUESTION_NOISE_SUFFIX_RE = re.compile(
    r"(?:\b(?:có\s+đúng\s+không|đúng\s+hay\s+sai|đúng\s+không|phải\s+không|hay\s+không"
    r"|co\s+dung\s+khong|dung\s+hay\s+sai|dung\s+khong|phai\s+khong)\b|[?!])+",
    re.IGNORECASE,
)
_THUE_TNDN_INLINE_RE = re.compile(r"\bthuế\s+tndn\b", re.IGNORECASE)
_BARE_TNDN_INLINE_RE = re.compile(r"\btndn\b", re.IGNORECASE)
_LEADING_DOC_NUMBER_LINE_RE = re.compile(r"^[^\n]{0,80}?\d{1,4}/(?:19|20)\d{2}[^\n]*?—\s*")
_SAME_ARTICLE_CLAUSE_REF_RE = re.compile(
    r"\bkhoản\s+(\d{1,2})(?:\s*(?:,|và|hoặc)\s*(?:khoản\s+)?(\d{1,2}))?(?:\s*(?:,|và|hoặc)\s*(?:khoản\s+)?(\d{1,2}))?\s+điều\s+này\b",
    re.IGNORECASE,
)
_BM25_TOKEN_RE = re.compile(r"[0-9a-zà-ỹ]+(?:[-/][0-9a-zà-ỹ]+)*", re.IGNORECASE)

# Domain-concept expansions for unaccented Vietnamese queries (sorted longest-first at lookup time).
_UNACCENTED_TERM_EXPANSIONS = (
    ("khong duoc tru", "khoản chi không được trừ"),
    ("duoc tru", "khoản chi được trừ"),
    ("thue suat", "thuế suất thuế thu nhập doanh nghiệp"),
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
)

_RERANKER_MAX_LENGTH = 384
_RERANKER_BATCH_SIZE = 4


def _resolve_reranker_device(torch_mod) -> str:
    configured = (settings.RAG_RERANKER_DEVICE or "auto").strip().lower()
    if configured and configured != "auto":
        return configured
    return "cuda" if torch_mod.cuda.is_available() else "cpu"


class _CrossEncoderReranker:
    """Thread-safe lazy Cross-Encoder with CPU INT8 dynamic quantization for fast Vietnamese legal reranking."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._tokenizer = None
        self._model = None
        self._device: str = "cpu"

    def _ensure_loaded(self) -> None:
        if self._model is not None:
            return
        with self._lock:
            if self._model is not None:
                return
            import torch
            from transformers import AutoModelForSequenceClassification, AutoTokenizer

            self._device = _resolve_reranker_device(torch)
            if self._device == "cpu":
                cpu_threads = max(2, os.cpu_count() or 4)
                torch.set_num_threads(cpu_threads)

            model_name = settings.RAG_RERANKER_MODEL
            tokenizer = AutoTokenizer.from_pretrained(model_name)
            model_kwargs = {"torch_dtype": torch.float16} if self._device.startswith("cuda") else {}
            model = AutoModelForSequenceClassification.from_pretrained(
                model_name, **model_kwargs
            ).to(self._device)
            model.eval()

            if self._device == "cpu" and isinstance(model, torch.nn.Module):
                model = torch.ao.quantization.quantize_dynamic(
                    model, {torch.nn.Linear}, dtype=torch.qint8
                )

            self._tokenizer = tokenizer
            self._model = model
            logger.info("Loaded Cross-Encoder reranker '%s' on %s", model_name, self._device)

    def warmup(self) -> None:
        if not settings.RAG_RERANKER_ENABLED:
            return
        self.score("thuế thu nhập doanh nghiệp", ["Quy định về thuế thu nhập doanh nghiệp."])

    def score(self, query: str, passages: list[str]) -> list[float] | None:
        if not passages or not settings.RAG_RERANKER_ENABLED:
            return None
        try:
            import torch

            self._ensure_loaded()
            # Sort by passage length before batching to minimize padding overhead on CPU.
            order = sorted(range(len(passages)), key=lambda idx: len(passages[idx]))
            ordered_scores = [0.0] * len(passages)

            with torch.inference_mode():
                for start in range(0, len(order), _RERANKER_BATCH_SIZE):
                    batch_idx = order[start : start + _RERANKER_BATCH_SIZE]
                    pairs = [[query, passages[idx]] for idx in batch_idx]
                    raw_inputs = self._tokenizer(
                        pairs,
                        padding=True,
                        truncation=True,
                        return_tensors="pt",
                        max_length=_RERANKER_MAX_LENGTH,
                    )
                    inputs = {
                        k: (v.to(self._device) if hasattr(v, "to") else v)
                        for k, v in raw_inputs.items()
                    }
                    logits = self._model(**inputs, return_dict=True).logits.view(-1).float()
                    for idx, logit in zip(batch_idx, logits.tolist()):
                        clamped = max(-20.0, min(20.0, logit))
                        ordered_scores[idx] = 1.0 / (1.0 + math.exp(-clamped))
            return ordered_scores
        except Exception:
            logger.warning("Cross-Encoder reranker unavailable; falling back to hybrid RRF", exc_info=True)
            return None


_reranker = _CrossEncoderReranker()


def warmup_reranker() -> None:
    """Preload Cross-Encoder weights during application startup so the first user query does not stall."""
    _reranker.warmup()


def _strip_question_noise(query: str) -> str:
    cleaned = _QUESTION_NOISE_SUFFIX_RE.sub(" ", query or "")
    return " ".join(cleaned.split()).strip() or (query or "").strip()


def _prepare_search_query(query: str) -> str:
    """Clean conversational suffixes and append accented CIT concepts for unaccented queries."""
    cleaned = _strip_question_noise(query)
    lower_cleaned = cleaned.lower()

    expansions: list[str] = []
    matched_spans: list[str] = []
    # Match longer phrases first so 'khong duoc tru' does not get shadowed by 'duoc tru'.
    for ascii_kw, accented in sorted(_UNACCENTED_TERM_EXPANSIONS, key=lambda item: len(item[0]), reverse=True):
        if ascii_kw in lower_cleaned and not any(ascii_kw in prev for prev in matched_spans):
            expansions.append(accented)
            matched_spans.append(ascii_kw)

    if not expansions and strip_vietnamese_accents(lower_cleaned) == lower_cleaned and "tndn" in lower_cleaned:
        expansions.append("thuế thu nhập doanh nghiệp")

    if expansions:
        return f"{cleaned} ({' '.join(expansions)})"
    return cleaned


def _prepare_rerank_query(query: str) -> str:
    """Keep a natural Vietnamese sentence while spelling out TNDN inline so PIT clauses are demoted."""
    cleaned = _strip_question_noise(query)
    if "thu nhập doanh nghiệp" not in cleaned.lower():
        if _THUE_TNDN_INLINE_RE.search(cleaned):
            cleaned = _THUE_TNDN_INLINE_RE.sub("thuế thu nhập doanh nghiệp", cleaned)
        elif _BARE_TNDN_INLINE_RE.search(cleaned):
            cleaned = _BARE_TNDN_INLINE_RE.sub("thuế thu nhập doanh nghiệp", cleaned)
    return cleaned


def _format_hit_for_rerank(hit: object) -> str:
    """Format structural heading + body without enactment years (temporal validity is already enforced by Qdrant)."""
    payload = getattr(hit, "payload", None) or {}
    meta_parts = [
        str(payload.get("article") or "").strip(),
        str(payload.get("clause") or "").strip(),
        str(payload.get("point") or "").strip(),
    ]
    header = " | ".join(part for part in meta_parts if part)
    raw_body = str(payload.get("text_content") or "").strip()
    body = _LEADING_DOC_NUMBER_LINE_RE.sub("", raw_body).strip()
    return f"[{header}] {body}" if header else body


def _tokenize_bm25(text: str) -> list[str]:
    lowered = (text or "").lower()
    accented_tokens = _BM25_TOKEN_RE.findall(lowered)
    ascii_tokens = _BM25_TOKEN_RE.findall(strip_vietnamese_accents(lowered))
    return accented_tokens + [tok for tok in ascii_tokens if tok not in accented_tokens]


def _compute_hybrid_rrf(query: str, hits: list, passages: list[str]) -> list[float]:
    """Combine dense vector rank, BM25Plus rank (RRF), and normalized BM25Plus lexical strength."""
    n = len(hits)
    if n == 0:
        return []
    if n == 1:
        return [1.0]

    dense_order = sorted(
        range(n),
        key=lambda i: (float(getattr(hits[i], "score", 0.0) or 0.0), -i),
        reverse=True,
    )
    dense_rank = {idx: rank for rank, idx in enumerate(dense_order, start=1)}

    corpus_tokens = [_tokenize_bm25(p) or ["_"] for p in passages]
    query_tokens = _tokenize_bm25(query) or ["_"]
    bm25 = BM25Plus(corpus_tokens)
    bm25_raw = [max(0.0, float(s)) for s in bm25.get_scores(query_tokens)]
    max_bm25 = max(bm25_raw, default=0.0)
    bm25_norm = [s / max_bm25 if max_bm25 > 0 else 0.0 for s in bm25_raw]

    bm25_order = sorted(range(n), key=lambda i: (bm25_raw[i], -i), reverse=True)
    bm25_rank = {idx: rank for rank, idx in enumerate(bm25_order, start=1)}

    max_rrf = 2.0 / (_RRF_K + 1)
    return [
        0.50 * (((1.0 / (_RRF_K + dense_rank[i])) + (1.0 / (_RRF_K + bm25_rank[i]))) / max_rrf)
        + 0.50 * bm25_norm[i]
        for i in range(n)
    ]


def _rerank_hits(query: str, hits: list, limit: int, *, use_cross_encoder: bool = True) -> list:
    """Stage-1 Hybrid RRF shortlist followed by Stage-2 Neural Cross-Encoder reranking."""
    if not hits:
        return []

    rerank_query = _prepare_rerank_query(query)
    bm25_query = _prepare_search_query(query)
    bm25_passages = [
        f"{(getattr(h, 'payload', None) or {}).get('document_number', '')} {_format_hit_for_rerank(h)}"
        for h in hits
    ]
    ce_passages = [_format_hit_for_rerank(h) for h in hits]
    rrf_scores = _compute_hybrid_rrf(bm25_query, hits, bm25_passages)

    shortlist_size = min(len(hits), max(limit + 4, _RERANK_SHORTLIST_SIZE))
    shortlist_indices = sorted(
        range(len(hits)),
        key=lambda i: (rrf_scores[i], -i),
        reverse=True,
    )[:shortlist_size]

    rerank_probs = (
        _reranker.score(rerank_query, [ce_passages[i] for i in shortlist_indices])
        if use_cross_encoder
        else None
    )

    scored_hits: list[tuple[float, int, object]] = []
    if rerank_probs is not None:
        for pos, orig_idx in enumerate(shortlist_indices):
            hit = hits[orig_idx]
            prob = rerank_probs[pos]
            raw_score = getattr(hit, "score", None)
            dense_score = float(raw_score) if raw_score is not None else 0.5
            if prob < _RERANK_MIN_PROB and dense_score < 0.65:
                continue
            final_score = 0.80 * prob + 0.20 * rrf_scores[orig_idx]
            scored_hits.append((final_score, -orig_idx, hit))

        if not scored_hits:
            scored_hits = [
                (0.80 * rerank_probs[pos] + 0.20 * rrf_scores[orig_idx], -orig_idx, hits[orig_idx])
                for pos, orig_idx in enumerate(shortlist_indices)
            ]
    else:
        for orig_idx in shortlist_indices:
            hit = hits[orig_idx]
            raw_score = getattr(hit, "score", None)
            dense_score = float(raw_score) if raw_score is not None else 0.5
            final_score = 0.70 * rrf_scores[orig_idx] + 0.30 * dense_score
            scored_hits.append((final_score, -orig_idx, hit))

    scored_hits.sort(reverse=True)
    return _cap_hits_per_document([hit for _, _, hit in scored_hits], limit)


def _cap_hits_per_document(ranked_hits: list, limit: int) -> list:
    """Preserve rank order while capping chunks per document, refilling from overflow if slots remain."""
    if limit <= 0:
        return []
    doc_cap = min(_MAX_CHUNKS_PER_DOCUMENT, max(limit - 1, 1))
    picked: list = []
    overflow: list = []
    per_doc: dict[str, int] = {}
    for hit in ranked_hits:
        doc_no = str((getattr(hit, "payload", None) or {}).get("document_number") or "").lower()
        if doc_no and per_doc.get(doc_no, 0) >= doc_cap:
            overflow.append(hit)
            continue
        per_doc[doc_no] = per_doc.get(doc_no, 0) + 1
        picked.append(hit)
        if len(picked) >= limit:
            return picked
    return picked + overflow[: limit - len(picked)]


def _is_rate_definition_chunk(hit: object) -> tuple[bool, bool]:
    """Return (is_general_rate_clause, is_revenue_tiered_rate_clause) using structural concepts only."""
    payload = getattr(hit, "payload", None) or {}
    header = " ".join(str(payload.get(k) or "") for k in ("article", "clause", "point")).lower()
    text = str(payload.get("text_content") or "").lower()
    if "%" not in text:
        return False, False
    if "thuế suất" not in header and "thuế suất" not in text:
        return False, False
    body = text.split("\n", 1)[-1] if "\n" in text else text
    if "giảm" in body and "thuế suất" not in body:
        return False, False
    if "ưu đãi" in header or "dầu khí" in body:
        return False, False
    has_revenue_tier = "doanh thu" in body
    return (not has_revenue_tier), has_revenue_tier


def _has_complete_rate_clauses(hits: list) -> bool:
    """True when retrieved chunks cover both the general CIT rate clause and revenue-tiered rate clauses."""
    has_general = False
    has_tiered = False
    for hit in hits:
        is_gen, is_tier = _is_rate_definition_chunk(hit)
        has_general = has_general or is_gen
        has_tiered = has_tiered or is_tier
    return has_general and has_tiered


def needs_rate_clauses(question: str, hits: list) -> bool:
    """Return True when a rate or payable-tax question lacks a complete set of rate clauses."""
    q_norm = " ".join((question or "").lower().split())
    if _PREFERENTIAL_RATE_RE.search(q_norm):
        return False
    asks_rate = bool(_RATE_QUESTION_RE.search(q_norm))
    if not asks_rate and _DEDUCTIBILITY_ONLY_RE.search(q_norm) and not _EXPLICIT_PAYABLE_RE.search(q_norm):
        return False
    asks_amount = bool(CALCULATION_QUESTION_RE.search(q_norm)) and any(
        kw in q_norm for kw in CALC_INTENT_KEYWORDS
    )
    return (asks_rate or asks_amount) and not _has_complete_rate_clauses(hits)


def _build_temporal_filter(period_start: str, period_end: str) -> Filter:
    rfc_start = to_rfc3339(period_start, is_end=False)
    rfc_end = to_rfc3339(period_end, is_end=True)
    return Filter(
        must=[
            FieldCondition(key="status", match=MatchValue(value=DocumentStatus.APPROVED)),
            FieldCondition(key="effective_from", range=DatetimeRange(lte=rfc_end)),
            Filter(
                should=[
                    FieldCondition(key="effective_to", range=DatetimeRange(gte=rfc_start)),
                    IsEmptyCondition(is_empty=PayloadField(key="effective_to")),
                    IsNullCondition(is_null=PayloadField(key="effective_to")),
                ]
            ),
        ],
    )


def _select_diverse_rate_clauses(candidates: list, existing_hits: list, max_extra: int) -> list:
    """Ensure both a general rate clause and revenue-tiered rate clauses are represented."""
    has_general = any(_is_rate_definition_chunk(h)[0] for h in existing_hits)
    has_tiered = any(_is_rate_definition_chunk(h)[1] for h in existing_hits)

    seen_ids = {getattr(h, "id", None) for h in existing_hits if getattr(h, "id", None) is not None}
    seen_clause_keys = {
        (
            str((getattr(h, "payload", None) or {}).get("document_number") or ""),
            str((getattr(h, "payload", None) or {}).get("article") or ""),
            str((getattr(h, "payload", None) or {}).get("clause") or ""),
        )
        for h in existing_hits
    }

    selected: list = []

    def _try_pick(require_general: bool | None) -> None:
        for hit in candidates:
            if len(selected) >= max_extra:
                return
            hid = getattr(hit, "id", None)
            if hid is not None and hid in seen_ids:
                continue
            is_gen, is_tier = _is_rate_definition_chunk(hit)
            if not (is_gen or is_tier):
                continue
            if require_general is True and not is_gen:
                continue
            if require_general is False and not is_tier:
                continue
            payload = getattr(hit, "payload", None) or {}
            clause_key = (
                str(payload.get("document_number") or ""),
                str(payload.get("article") or ""),
                str(payload.get("clause") or ""),
            )
            if clause_key in seen_clause_keys:
                continue
            selected.append(hit)
            if hid is not None:
                seen_ids.add(hid)
            seen_clause_keys.add(clause_key)
            if require_general is not None:
                return

    if not has_general:
        _try_pick(require_general=True)
    if not has_tiered:
        _try_pick(require_general=False)
    _try_pick(require_general=None)
    return selected


def _fetch_missing_article_siblings(hits: list, period_start: str, period_end: str) -> list:
    """Fetch Khoản 1 or explicitly cross-referenced clauses ('khoản X Điều này') of top-ranked articles."""
    if not hits or not hasattr(qdrant_client, "scroll"):
        return []

    anchor_doc = ""
    anchor_article = ""
    for candidate in hits[:3]:
        p = getattr(candidate, "payload", None) or {}
        doc_no = str(p.get("document_number") or "").strip()
        article = str(p.get("article") or "").strip()
        clause = str(p.get("clause") or "").strip()
        text = str(p.get("text_content") or "")
        if doc_no and article and article.lower().startswith("điều") and (
            clause or _SAME_ARTICLE_CLAUSE_REF_RE.search(text)
        ):
            anchor_doc = doc_no
            anchor_article = article
            break

    if not anchor_doc or not anchor_article:
        return []

    present_clauses = {
        str((getattr(h, "payload", None) or {}).get("clause") or "").strip()
        for h in hits
        if str((getattr(h, "payload", None) or {}).get("document_number") or "").strip() == anchor_doc
        and str((getattr(h, "payload", None) or {}).get("article") or "").strip() == anchor_article
    }

    target_clauses: list[str] = []
    if "Khoản 1" not in present_clauses and any(c and c != "Khoản 1" for c in present_clauses):
        target_clauses.append("Khoản 1")

    for hit in hits[:3]:
        p = getattr(hit, "payload", None) or {}
        if (
            str(p.get("document_number") or "").strip() != anchor_doc
            or str(p.get("article") or "").strip() != anchor_article
        ):
            continue
        text = str(p.get("text_content") or "")
        for groups in _SAME_ARTICLE_CLAUSE_REF_RE.findall(text):
            for num in groups:
                if num:
                    label = f"Khoản {int(num)}"
                    if label not in present_clauses and label not in target_clauses:
                        target_clauses.append(label)

    if not target_clauses:
        return []

    base_filter = _build_temporal_filter(period_start, period_end)
    sibling_filter = Filter(
        must=[
            *(base_filter.must or []),
            FieldCondition(key="document_number", match=MatchValue(value=anchor_doc)),
            FieldCondition(key="article", match=MatchValue(value=anchor_article)),
            Filter(
                should=[
                    FieldCondition(key="clause", match=MatchValue(value=cl))
                    for cl in target_clauses[:3]
                ]
            ),
        ]
    )
    try:
        points, _ = qdrant_client.scroll(
            collection_name=settings.QDRANT_COLLECTION,
            scroll_filter=sibling_filter,
            limit=2,
            with_payload=True,
            with_vectors=False,
        )
        seen_ids = {getattr(h, "id", None) for h in hits if getattr(h, "id", None) is not None}
        return [pt for pt in (points or []) if getattr(pt, "id", None) not in seen_ids]
    except Exception:
        logger.debug("Sibling clause lookup skipped", exc_info=True)
        return []


class TemporalRetriever:
    @staticmethod
    def retrieve(query: str, period_start: str, period_end: str, limit: int = _DEFAULT_LIMIT):
        effective_query = _prepare_search_query(query)
        candidate_limit = max(limit * 6, 40)
        hits = TemporalRetriever._search(effective_query, period_start, period_end, candidate_limit)
        return _rerank_hits(query, hits, limit, use_cross_encoder=True)

    @staticmethod
    def retrieve_for_chat(question: str, period_start: str, period_end: str, limit: int = _DEFAULT_LIMIT):
        """Retrieve ranked clauses for chat, expanding referenced same-article siblings and rate brackets."""
        hits = TemporalRetriever.retrieve(question, period_start, period_end, limit)
        siblings = _fetch_missing_article_siblings(hits, period_start, period_end)
        if siblings:
            hits = hits + siblings

        if not needs_rate_clauses(question, hits):
            return hits

        # Rank rate-article candidates via Hybrid RRF to avoid a second Cross-Encoder pass on CPU.
        rate_candidates = TemporalRetriever._search(_RATE_CLAUSE_QUERY, period_start, period_end, 18)
        ranked_rates = _rerank_hits(_RATE_CLAUSE_QUERY, rate_candidates, 10, use_cross_encoder=False)
        extra = _select_diverse_rate_clauses(ranked_rates, hits, _MAX_RATE_CLAUSES)
        return hits + extra

    @staticmethod
    def _search(
        effective_query: str,
        period_start: str,
        period_end: str,
        candidate_limit: int,
    ) -> list:
        query_vector = embedding_model.embed_query(effective_query)
        temporal_filter = _build_temporal_filter(period_start, period_end)

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
