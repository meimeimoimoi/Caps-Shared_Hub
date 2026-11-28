import re

from app.core.cit_math import (
    NUMBER_TOKEN_RE,
    UNIT_SCALE_VND,
    money_representations,
    normalize_number_token,
    parse_numeric_scalar,
)
from app.core.legal_refs import extract_document_numbers
from app.core.cit_math import resolve_statutory_cit_rate
from app.modules.rag.cit_calculator import CitCalcHint, _extract_labeled_vnd

_PERCENT_RE = re.compile(r"(\d+(?:[.,]\d+)?)\s*%")

# One bracket may cite several sources: "[1]", "[1, 3]", "[1; 3]" or a range "[1-3]".
CITATION_MARKER_RE = re.compile(r"\[(\d{1,3}(?:\s*[,;\u2013-]\s*\d{1,3})*)\]")
_MAX_CITATION_RANGE = 20
# Calendar dates ("ngày 31 tháng 03 năm 2027", "31/03/2027", "tháng 8/2026") are not durations.
_DATE_SPAN_RE = re.compile(
    r"\b(?:ngày\s+)?\d{1,2}\s+tháng\s+\d{1,2}(?:\s+năm\s+\d{4})?"
    r"|\b(?:ngày\s+)?\d{1,2}/\d{1,2}/\d{4}"
    r"|\b(?:tháng|quý)\s+\d{1,2}(?:/\d{4}|\s+năm\s+\d{4})",
    re.IGNORECASE,
)


def citation_indexes(text: str | None) -> set[int]:
    """Return every source index cited in the text, expanding lists and short ranges inside one bracket."""
    indexes: set[int] = set()
    for group in CITATION_MARKER_RE.findall(text or ""):
        for part in re.split(r"\s*[,;]\s*", group):
            bounds = [int(x) for x in re.split(r"\s*[\u2013-]\s*", part) if x]
            if len(bounds) == 2 and bounds[0] <= bounds[1] and bounds[1] - bounds[0] < _MAX_CITATION_RANGE:
                indexes.update(range(bounds[0], bounds[1] + 1))
            else:
                indexes.update(bounds)
    return indexes
_RATE_OR_DURATION_RE = re.compile(
    # (?!\w) instead of \b: a trailing \b never matches after "%", which silently skipped every rate.
    r"\b(\d+(?:[.,]\d+)?)\s*(%|phần\s+trăm|năm|tháng|ngày)(?!\w)", re.IGNORECASE
)
_DOC_NUMBER_SPAN_RE = re.compile(r"(?<![\d/])\d{1,4}/(?:19|20)\d{2}(?:/[\w\-]+)?", re.IGNORECASE)
_STRUCTURAL_REF_RE = re.compile(r"\b(?:chương|mục|điều|khoản)\s+[ivxlcdm\d]+\b", re.IGNORECASE)
_SCALED_SOURCE_AMOUNT_RE = re.compile(r"\b(\d+(?:[.,]\d+)?)\s*(tỷ|triệu|nghìn|ngàn)\b", re.IGNORECASE)
# Exclude bare "năm" because "năm" means "year" in tax law and would falsely authorize "5".
_VIETNAMESE_NUMBER_UNIT_RE = re.compile(
    r"\b(một|hai|ba|bốn|sáu|bảy|tám|chín|mười)\s+(?:năm|tháng|ngày|triệu|tỷ)\b", re.IGNORECASE
)
_VIETNAMESE_NUMBER_WORDS = {
    "một": "1", "hai": "2", "ba": "3", "bốn": "4",
    "sáu": "6", "bảy": "7", "tám": "8", "chín": "9", "mười": "10",
}
_NEGATION_MARKERS = (
    "không đúng", "chưa đúng", "sai", "không phải", "không có quy định",
    "không quy định", "không giới hạn", "không áp dụng", "không bị giới hạn",
)
_CLAUSE_SPLIT_RE = re.compile(
    r"[.;\n]+|\b(?:nhưng|tuy\s+nhiên|mặt\s+khác|còn\s+lại|ngoài\s+ra)\b", re.IGNORECASE
)
_EXCESS_PORTION_RE = re.compile(
    r"(?:"
    r"\b(?:phần|khoản|mức|chi\s+phí|khấu\s+hao)[^.;\n]{0,60}\bvượt\b"
    r"|\bvượt\s+(?:mức|trên|quá)\b"
    r"|\b(?:từ|trên)\s+1[.,]6\b"
    r"|\b1[.,]6\s*(?:–|-|đến)\s*\d+"
    r")",
    re.IGNORECASE,
)
_NON_DEDUCTIBLE_RE = re.compile(
    r"\bkhông\s+(?:được\s+trừ|tính\s+vào\s+chi\s+phí\s+được\s+trừ|được\s+tính\s+vào\s+chi\s+phí)\b",
    re.IGNORECASE,
)
_DEDUCTIBLE_RE = re.compile(
    r"\b(?:được\s+trừ|tính\s+vào\s+chi\s+phí\s+được\s+trừ)\b", re.IGNORECASE
)


def is_negated_clause(clause: str) -> bool:
    lowered = clause.lower()
    return any(marker in lowered for marker in _NEGATION_MARKERS)


def allowed_document_numbers_from_chunks(used_chunks: list) -> set[str]:
    """Collect normalized legal document numbers strictly from the chunks actually cited."""
    allowed: set[str] = set()
    for hit in used_chunks:
        payload = hit.payload or {}
        for key in ("document_number", "document_title", "doc_title", "text_content"):
            allowed |= extract_document_numbers(str(payload.get(key) or ""))
    return allowed


def _source_numeric_values(used_chunks: list) -> set[str]:
    """Extract substantive numeric values from used chunk bodies, excluding structural Điều/Khoản labels."""
    combined = " ".join(str((hit.payload or {}).get("text_content") or "") for hit in used_chunks).lower()
    combined = _STRUCTURAL_REF_RE.sub(" ", _DOC_NUMBER_SPAN_RE.sub(" ", combined))

    values = {normalize_number_token(tok) for tok in NUMBER_TOKEN_RE.findall(combined)}
    for raw_amt, unit in _SCALED_SOURCE_AMOUNT_RE.findall(combined):
        if (parsed := parse_numeric_scalar(raw_amt)) is not None:
            values |= money_representations(parsed * UNIT_SCALE_VND[unit.lower()])
    for word in _VIETNAMESE_NUMBER_UNIT_RE.findall(combined):
        if digit := _VIETNAMESE_NUMBER_WORDS.get(word.lower()):
            values.add(digit)
    return values


def _nearby_years(period_numbers: set[str]) -> set[str]:
    """Years a grounded answer may derive from the period: filing deadlines and loss carry-forward (up to 5 years)."""
    years = [int(tok) for tok in period_numbers if len(tok) == 4 and 1900 <= int(tok) <= 2100]
    if not years:
        return set()
    return {str(y) for y in range(min(years) - 5, max(years) + 6)}


def mismatched_bracket_rate(question: str, conclusion: str, used_chunks: list) -> str | None:
    """Return a retry note when the conclusion states a CIT rate that contradicts the revenue bracket in the question."""
    revenue = _extract_labeled_vnd((question or "").lower(), r"\b(?:tổng\s+)?doanh\s+thu(?:\s+năm\s+\d{4})?")
    if revenue is None:
        return None
    law_text = " ".join(str((hit.payload or {}).get("text_content") or "") for hit in used_chunks)
    expected = resolve_statutory_cit_rate(revenue_vnd=revenue, law_text=law_text, explicit_rate=None)
    if expected is None:
        return None
    stated = {float(normalize_number_token(m)) for m in _PERCENT_RE.findall(CITATION_MARKER_RE.sub(" ", conclusion or ""))}
    bracket_rates = stated & {15.0, 17.0, 20.0}
    if not bracket_rates or expected in bracket_rates:
        return None
    return (
        f"Kết luận trước nêu sai mức thuế suất theo doanh thu trong câu hỏi: theo đoạn căn cứ, mức áp dụng là {expected:g}%. "
        "Hãy đối chiếu đúng khung doanh thu trong đoạn căn cứ."
    )


def find_ungrounded_numbers(
    question: str,
    conclusion: str,
    used_chunks: list,
    period_str: str = "",
    calc_hint: CitCalcHint | None = None,
) -> list[str]:
    """Flag any number, rate, or duration in conclusion not backed by cited chunks or Python calculation."""
    if not conclusion:
        return []

    stripped = _STRUCTURAL_REF_RE.sub(" ", _DOC_NUMBER_SPAN_RE.sub(" ", CITATION_MARKER_RE.sub(" ", conclusion)))
    source_numbers = _source_numeric_values(used_chunks)
    calc_numbers = calc_hint.authorized_numbers if calc_hint else set()
    period_numbers = {normalize_number_token(tok) for tok in NUMBER_TOKEN_RE.findall(period_str or "")}
    period_numbers |= _nearby_years(period_numbers)

    question_clean = _DOC_NUMBER_SPAN_RE.sub(" ", question or "")
    question_numbers = {normalize_number_token(tok) for tok in NUMBER_TOKEN_RE.findall(question_clean)}
    for raw_amt, unit in _SCALED_SOURCE_AMOUNT_RE.findall(question_clean.lower()):
        if (parsed := parse_numeric_scalar(raw_amt)) is not None:
            question_numbers |= money_representations(parsed * UNIT_SCALE_VND[unit.lower()])

    ungrounded: list[str] = []
    for sentence in re.split(r"[.!?\n]+", stripped):
        negated = is_negated_clause(sentence)
        for raw_num, unit in _RATE_OR_DURATION_RE.findall(_DATE_SPAN_RE.sub(" ", sentence)):
            norm_num = normalize_number_token(raw_num)
            if norm_num in source_numbers or norm_num in calc_numbers:
                continue
            if unit.lower() == "năm" and len(norm_num) == 4 and norm_num in period_numbers:
                continue
            if negated and norm_num in question_numbers:
                continue
            unit_clean = "%" if unit == "%" else unit
            label = f"{raw_num}%" if unit_clean == "%" else f"{raw_num} {unit_clean}"
            if label not in ungrounded:
                ungrounded.append(label)

    allowed_any = source_numbers | calc_numbers | question_numbers | period_numbers
    for raw_tok in NUMBER_TOKEN_RE.findall(stripped):
        if normalize_number_token(raw_tok) not in allowed_any and raw_tok not in ungrounded:
            ungrounded.append(raw_tok)
    return ungrounded


_MAX_BACKFILLED_SOURCES = 2


def _same_lead_word(conclusion: str, hit, figure: str) -> bool:
    """True when the word right before the figure in the conclusion also precedes it in the chunk.

    "là 20%" in the answer matches "là 20%" in the rate clause, but "giảm 20%" does not, so a wrong
    figure is not accepted just because the same number appears elsewhere in the context.
    """
    chunk = " ".join(str((hit.payload or {}).get("text_content") or "").lower().split())
    leads = re.findall(r"(\w+)\s+" + re.escape(figure.lower()) + r"(?![\d,.])", " ".join(conclusion.lower().split()))
    return any(f"{lead} {figure.lower()}" in chunk for lead in leads)


def backfill_sources_for_figures(
    question: str,
    conclusion: str,
    used_chunks: list,
    retrieved_chunks: list,
    period_str: str = "",
    calc_hint: CitCalcHint | None = None,
) -> list | None:
    """Return used chunks plus at most two other retrieved chunks that back every flagged figure, or None.

    The model sometimes states a figure that is in the retrieved context but cites the wrong chunk;
    citing the chunk that holds the figure is better than rejecting a grounded answer.
    """
    used = list(used_chunks)
    remaining = find_ungrounded_numbers(question, conclusion, used, period_str=period_str, calc_hint=calc_hint)
    for hit in retrieved_chunks:
        if not remaining or len(used) - len(used_chunks) >= _MAX_BACKFILLED_SOURCES:
            break
        if any(hit is u for u in used):
            continue
        after = find_ungrounded_numbers(question, conclusion, used + [hit], period_str=period_str, calc_hint=calc_hint)
        newly_backed = [fig for fig in remaining if fig not in after]
        if newly_backed and all(_same_lead_word(conclusion, hit, fig) for fig in newly_backed):
            used.append(hit)
            remaining = after
    return used if not remaining and len(used) > len(used_chunks) else None


def missing_verified_tax_note(conclusion: str, calc_hint: CitCalcHint | None) -> str | None:
    """Return a retry instruction when Python computed a tax figure that the conclusion failed to state."""
    if not calc_hint or not calc_hint.expected_tax_numbers:
        return None
    conclusion_nums = {
        normalize_number_token(tok)
        for tok in NUMBER_TOKEN_RE.findall(CITATION_MARKER_RE.sub(" ", conclusion))
    }
    if conclusion_nums & calc_hint.expected_tax_numbers:
        return None
    return (
        f"Kết luận trước chưa nêu đúng số thuế TNDN phải nộp đã kiểm toán là {calc_hint.expected_tax_label}. "
        "Bắt buộc sử dụng đúng kết quả tính thuế đã kiểm toán bằng code, không lấy nhầm thu nhập tính thuế hay doanh thu."
    )


def has_reversed_cap_polarity(conclusion: str, used_chunks: list) -> bool:
    """Detect when a cited cap states excess is non-deductible, but the conclusion calls excess deductible."""
    source_text = " ".join(str((hit.payload or {}).get("text_content") or "") for hit in used_chunks)
    if not ("vượt" in source_text.lower() and _NON_DEDUCTIBLE_RE.search(source_text)):
        return False
    for clause in _CLAUSE_SPLIT_RE.split(conclusion or ""):
        if _EXCESS_PORTION_RE.search(clause) and _DEDUCTIBLE_RE.search(clause) and not _NON_DEDUCTIBLE_RE.search(clause):
            return True
    return False


def drops_critical_condition(question: str, conclusion: str, used_chunks: list) -> str | None:
    """Check that mandatory statutory eligibility conditions in cited chunks are not dropped (S02, A22)."""
    source_text = " ".join(str((hit.payload or {}).get("text_content") or "") for hit in used_chunks).lower()
    c_low = (conclusion or "").lower()
    q_low = (question or "").lower()

    if (
        "hộ kinh doanh" in source_text
        and "miễn thuế" in source_text
        and "miễn thuế" in c_low
        and not is_negated_clause(c_low)
        and "hộ kinh doanh" not in c_low
        and "hộ kinh doanh" not in q_low
    ):
        return (
            "Kết luận trước làm mất điều kiện áp dụng bắt buộc trong căn cứ ('thành lập mới từ hộ kinh doanh'). "
            "Hãy nêu đầy đủ điều kiện đối tượng áp dụng theo đúng nguyên văn đoạn căn cứ."
        )

    if (
        "bất động sản" in source_text
        and "bù trừ" in source_text
        and "ưu đãi" in source_text
        and "không được bù trừ" in c_low
        and "ưu đãi" not in c_low
    ):
        return (
            "Kết luận trước nêu thiếu phạm vi hạn chế bù trừ lỗ bất động sản: đoạn căn cứ quy định cụ thể "
            "về việc không bù trừ với thu nhập của dự án đang hưởng ưu đãi thuế. Hãy nêu chính xác theo căn cứ."
        )
    return None
