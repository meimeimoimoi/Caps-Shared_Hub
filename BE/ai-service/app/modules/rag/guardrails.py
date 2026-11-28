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


_REVENUE_RANGE_RE = re.compile(
    r"\bdoanh\s+thu[^;\n?\d]{0,40}?\d[\d.,]*\s*(?:tỷ|triệu)?[^;\n?\d]{0,25}?\b(?:đến|tới)\b[^;\n?\d]{0,20}?\d",
    re.IGNORECASE,
)


_REVENUE_LABEL = r"\b(?:tổng\s+)?doanh\s+thu(?:\s+năm\s+\d{4})?"
# "Thuế suất phổ thông" asks for the general rate, not an SME bracket (TS-01).
_GENERAL_RATE_MARKERS = ("phổ thông", "thuế suất chung", "thông thường", "thuế suất cơ bản")
_YES_NO_QUESTION_RE = re.compile(r"\b(?:đúng\s+không|có\s+đúng|phải\s+không|đúng\s+hay\s+sai)\b", re.IGNORECASE)
_AFFIRMS_RE = re.compile(r"^\W*(?:đúng|chính\s+xác|phải)\b", re.IGNORECASE)
_DENIES_PREMISE_RE = re.compile(r"^\W*(?:sai|không\s+(?:đúng|phải|chính\s+xác)|chưa\s+(?:đúng|chính\s+xác))\b", re.IGNORECASE)
# "trong 10 năm", "05 năm"; a period year such as "năm 2026" puts the number after the word.
_DURATION_RE = re.compile(r"\b(\d{1,3})\s+năm\b", re.IGNORECASE)
_SLASH_DATE_RE = re.compile(r"(?<![\d/])(\d{1,2})/(\d{1,2})(?:/\d{4})?(?![\d/])")
_WORDED_DATE_RE = re.compile(r"\bngày\s+(\d{1,2})\s+tháng\s+(\d{1,2})\b", re.IGNORECASE)


def _dates(text: str) -> set[tuple[int, int]]:
    found = _SLASH_DATE_RE.findall(text) + _WORDED_DATE_RE.findall(text)
    return {(int(d), int(m)) for d, m in found if 1 <= int(d) <= 31 and 1 <= int(m) <= 12}


def affirms_unsupported_premise(question: str, conclusion: str, used_chunks: list) -> str | None:
    """Return a retry note when a yes/no question is answered "Đúng" though a duration or date in it is not in the cited law.

    TS-09 "17% trong 10 năm đúng không?" and KK-10 "hạn nộp là ngày 30/4/2027 đúng không?" were both answered "Đúng".
    """
    body = CITATION_MARKER_RE.sub(" ", conclusion or "")
    if not _YES_NO_QUESTION_RE.search(question or "") or not _AFFIRMS_RE.search(body):
        return None
    law_text = _chunks_text(used_chunks)
    q_low = (question or "").lower()
    law_years = {int(n) for n in _DURATION_RE.findall(law_text)}
    missing = [f"{int(n)} năm" for n in _DURATION_RE.findall(q_low) if int(n) not in law_years]
    law_dates = _dates(law_text)
    missing += [f"ngày {d}/{m}" for d, m in sorted(_dates(q_low)) if (d, m) not in law_dates]
    if not missing:
        return None
    details = ", ".join(missing)
    # The model repeated "Đúng" after a softer note (TS-09, KK-10 in the 28/11 log), so spell out the opening.
    return (
        f"Kết luận trước trả lời 'Đúng' nhưng đoạn căn cứ không có chi tiết: {details}. "
        "Kết luận mới BẮT BUỘC mở đầu bằng chữ 'Sai' (hoặc 'Sai một phần' nếu phần còn lại của câu hỏi đúng), "
        "TUYỆT ĐỐI KHÔNG mở đầu bằng 'Đúng'. Sau đó viết: "
        f"\"đoạn căn cứ không quy định {details}\" và nêu quy định đúng theo đoạn căn cứ, kèm số thứ tự căn cứ."
    )
_REDUCTION_LIMIT_RE = re.compile(r"doanh\s+thu[^.;]{0,60}?không\s+quá\s+(\d+(?:[.,]\d+)?)\s*tỷ", re.IGNORECASE)
_GRANTS_REDUCTION_RE = re.compile(r"\bđược\s+giảm\s+30\s*%", re.IGNORECASE)
_DENIES_REDUCTION_RE = re.compile(r"\b(?:không|chưa)\s+(?:được\s+|đủ\s+điều\s+kiện\s+)?(?:giảm|hưởng)", re.IGNORECASE)


def _chunks_text(*chunk_lists: list | None) -> str:
    return " ".join(
        str((hit.payload or {}).get("text_content") or "") for chunks in chunk_lists for hit in (chunks or [])
    )


def _expected_rate(question: str, law_text: str) -> float | None:
    """The CIT rate the law gives for the question: by its revenue figure, or the general rate when asked for."""
    q_low = (question or "").lower()
    if _REVENUE_RANGE_RE.search(q_low):
        # "từ trên 3 tỷ đến không quá 50 tỷ" names a whole bracket, not one revenue figure (TS-03).
        return None
    revenue = _extract_labeled_vnd(q_low, _REVENUE_LABEL)
    if revenue is not None:
        return resolve_statutory_cit_rate(revenue_vnd=revenue, law_text=law_text, explicit_rate=None)
    if any(marker in q_low for marker in _GENERAL_RATE_MARKERS) and "20%" in law_text.lower():
        return 20.0
    return None


def mismatched_bracket_rate(
    question: str, conclusion: str, used_chunks: list, retrieved_chunks: list | None = None
) -> str | None:
    """Return a retry note when the conclusion states a CIT rate that contradicts the revenue bracket in the question.

    The bracket is read from every retrieved chunk, because the model often cites only the 15%/17% clauses (task 19).
    """
    expected = _expected_rate(question, _chunks_text(used_chunks, retrieved_chunks))
    if expected is None:
        return None
    body = CITATION_MARKER_RE.sub(" ", conclusion or "")
    stated = {float(normalize_number_token(m)) for m in _PERCENT_RE.findall(body)}
    bracket_rates = stated & {15.0, 17.0, 20.0}

    if _YES_NO_QUESTION_RE.search(question or "") and not _DENIES_PREMISE_RE.search(body):
        asked = {float(normalize_number_token(m)) for m in _PERCENT_RE.findall(question or "")} & {15.0, 17.0, 20.0}
        if asked and expected not in asked:
            # TS-11: "doanh thu 5 tỷ được áp thuế suất 15% đúng không?" answered "Đúng ... 17%" or just "... 17%".
            return (
                f"Tiền đề trong câu hỏi sai: theo đoạn căn cứ, mức thuế suất áp dụng là {expected:g}%, không phải "
                + ", ".join(f"{r:g}%" for r in sorted(asked))
                + ". Hãy trả lời 'Sai' và nêu mức đúng kèm căn cứ."
            )

    if not bracket_rates or expected in bracket_rates:
        return None
    return (
        f"Kết luận trước nêu sai mức thuế suất theo doanh thu trong câu hỏi: theo đoạn căn cứ, mức áp dụng là {expected:g}%. "
        "Hãy đối chiếu đúng khung doanh thu trong đoạn căn cứ."
    )


def mismatched_reduction_eligibility(question: str, conclusion: str, retrieved_chunks: list) -> str | None:
    """Return a retry note when the 30% reduction is granted or denied against the revenue limit in the law (MG-07)."""
    law_text = _chunks_text(retrieved_chunks)
    if "giảm 30%" not in law_text.lower():
        return None
    limit_match = _REDUCTION_LIMIT_RE.search(law_text)
    revenue = _extract_labeled_vnd((question or "").lower(), _REVENUE_LABEL)
    if limit_match is None or revenue is None or _REVENUE_RANGE_RE.search((question or "").lower()):
        return None
    limit = parse_numeric_scalar(limit_match.group(1).replace(",", "."))
    if limit is None:
        return None
    limit_vnd = limit * UNIT_SCALE_VND["tỷ"]
    body = CITATION_MARKER_RE.sub(" ", conclusion or "")
    grants = bool(_GRANTS_REDUCTION_RE.search(body)) and not _DENIES_REDUCTION_RE.search(body)
    if revenue > limit_vnd and grants:
        return (
            f"Kết luận trước cho giảm 30% nhưng doanh thu trong câu hỏi vượt mức không quá {limit:g} tỷ đồng "
            "trong đoạn căn cứ. Hãy kết luận doanh nghiệp không được giảm 30% và nêu căn cứ."
        )
    return None


def find_ungrounded_numbers(
    question: str,
    conclusion: str,
    used_chunks: list,
    period_str: str = "",
    calc_hint: CitCalcHint | None = None,
    extra_allowed: set[str] | None = None,
) -> list[str]:
    """Flag any number, rate, or duration in conclusion not backed by cited chunks or Python calculation.

    `extra_allowed` holds figures the service itself put in the retry note, such as a summed total (CP-03).
    """
    if not conclusion:
        return []

    stripped = _STRUCTURAL_REF_RE.sub(" ", _DOC_NUMBER_SPAN_RE.sub(" ", CITATION_MARKER_RE.sub(" ", conclusion)))
    source_numbers = _source_numeric_values(used_chunks)
    calc_numbers = (calc_hint.authorized_numbers if calc_hint else set()) | (extra_allowed or set())
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


def figures_in_text(text: str) -> set[str]:
    """Normalized numbers of a service-written note, with money amounts in every written form."""
    clean = _DOC_NUMBER_SPAN_RE.sub(" ", text or "")
    figures = {normalize_number_token(tok) for tok in NUMBER_TOKEN_RE.findall(clean)}
    for raw_amt, unit in _SCALED_SOURCE_AMOUNT_RE.findall(clean.lower()):
        if (parsed := parse_numeric_scalar(raw_amt)) is not None:
            figures |= money_representations(parsed * UNIT_SCALE_VND[unit.lower()])
    return figures


_MAX_BACKFILLED_SOURCES = 2


def _is_expected_rate(conclusion: str, figure: str, expected_rate: float | None, hit) -> bool:
    """True when the answer states the bracket rate the code read from the law and the chunk defines that rate (TS-04).

    A reduction ("giảm 20%") is not a rate, so the answer itself must call the figure "thuế suất".
    """
    if expected_rate is None or "thuế suất" not in conclusion.lower() or not figure.endswith("%") and not re.fullmatch(r"\d+(?:[.,]\d+)?", figure):
        return False
    value = parse_numeric_scalar(figure.rstrip("%").replace(",", "."))
    chunk = str((hit.payload or {}).get("text_content") or "").lower()
    return value == expected_rate and "thuế suất" in chunk and f"{expected_rate:g}%" in chunk


def _same_lead_word(conclusion: str, hit, figure: str) -> bool:
    """True when the word right before the figure in the conclusion also precedes it in the chunk.

    "là 20%" in the answer matches "là 20%" in the rate clause, but "giảm 20%" does not, so a wrong
    figure is not accepted just because the same number appears elsewhere in the context.
    """
    chunk = " ".join(str((hit.payload or {}).get("text_content") or "").lower().split())
    # Stop only at a longer number ("20" in "20,5" or "20.5"), not at a sentence-ending period ("là 20%.").
    leads = re.findall(
        r"(\w+)\s+" + re.escape(figure.lower()) + r"(?!\d|[.,]\d)", " ".join(conclusion.lower().split())
    )
    return any(f"{lead} {figure.lower()}" in chunk for lead in leads)


def backfill_sources_for_figures(
    question: str,
    conclusion: str,
    used_chunks: list,
    retrieved_chunks: list,
    period_str: str = "",
    calc_hint: CitCalcHint | None = None,
    extra_allowed: set[str] | None = None,
) -> list | None:
    """Return used chunks plus at most two other retrieved chunks that back every flagged figure, or None.

    The model sometimes states a figure that is in the retrieved context but cites the wrong chunk;
    citing the chunk that holds the figure is better than rejecting a grounded answer.
    """
    used = list(used_chunks)
    kwargs = {"period_str": period_str, "calc_hint": calc_hint, "extra_allowed": extra_allowed}
    remaining = find_ungrounded_numbers(question, conclusion, used, **kwargs)
    # TS-04: "là 20%" was cited from the 15%/17% clause; the code knows 20% is the rate for the revenue asked.
    expected_rate = _expected_rate(question, _chunks_text(retrieved_chunks))
    for hit in retrieved_chunks:
        if not remaining or len(used) - len(used_chunks) >= _MAX_BACKFILLED_SOURCES:
            break
        if any(hit is u for u in used):
            continue
        after = find_ungrounded_numbers(question, conclusion, used + [hit], **kwargs)
        newly_backed = [fig for fig in remaining if fig not in after]
        if newly_backed and all(
            _same_lead_word(conclusion, hit, fig) or _is_expected_rate(conclusion, fig, expected_rate, hit) for fig in newly_backed
        ):
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
        f"Kết luận trước chưa nêu đúng {calc_hint.expected_result_name} đã kiểm toán là {calc_hint.expected_tax_label}. "
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


_DEDUCTIBILITY_QUESTION_RE = re.compile(
    r"\b(?:được\s+trừ|tính\s+(?:vào\s+)?chi\s+phí|chi\s+phí\s+được\s+trừ)\b", re.IGNORECASE
)
_AFFIRMS_DEDUCTIBLE_RE = re.compile(
    r"\b(?:được\s+(?:trừ|tính\s+(?:vào\s+)?chi\s+phí)|tính\s+vào\s+chi\s+phí\s+được\s+trừ)\b", re.IGNORECASE
)
_DENIES_DEDUCTIBLE_RE = re.compile(
    r"\bkhông\s+(?:được\s+(?:trừ|tính)|tính\s+vào\s+chi\s+phí)|\bchỉ\s+được\s+(?:trừ|tính)|\bphần\s+vượt\b",
    re.IGNORECASE,
)
# The article title in the chunk breadcrumb, not "Trừ các khoản chi không được trừ ..." inside Điều 9 (CP-16).
_NON_DEDUCTIBLE_HEADING_RE = re.compile(r"\bĐiều\s+\d+\.\s+Các\s+khoản\s+chi\s+không\s+được\s+trừ\b", re.IGNORECASE)
_YES_NO_DEDUCTIBLE_RE = re.compile(r"\bcó\s+(?:được|phải)\b.*\bkhông\b|\bkhông\s*\?", re.IGNORECASE)
# A cap item ("phần chi vượt mức ...") is partly deductible; has_reversed_cap_polarity handles it.
_PARTIAL_CAP_ITEM_RE = re.compile(r"\b(?:phần|khoản)\s+(?:chi\s+)?(?:trả\s+)?vượt\b|\bvượt\s+(?:mức|trên)\b", re.IGNORECASE)
_LIST_ITEM_SPLIT_RE = re.compile(r";|\n|\s(?=[a-zđ]\d?\)\s)|\s(?=\d{1,2}\.\s)")
_WORD_RE = re.compile(r"[^\W\d_]+")
# Words shared by most CIT questions and law items; a phrase made only of them says nothing about the topic.
_GENERIC_WORDS = frozenset(
    "chi phí được trừ có không tính vào thu nhập chịu thuế xác định doanh nghiệp công ty tndn khoản các khi này "
    "phải sản xuất kinh hoạt động năm của cho và là với trong đã bị người lao hợp trường quy theo đối tượng".split()
)
# The question's wording and the law's wording for the same expense.
_QUESTION_SYNONYMS = (("đồng phục", "trang phục"),)
_CASH_THRESHOLD_RE = re.compile(r"(?:từ\s+)?(\d+(?:[.,]\d+)?)\s*triệu\s+đồng\s+trở\s+lên", re.IGNORECASE)
_REPEATED_PAYMENT_RE = re.compile(
    r"(\d+)\s*lần[^.;\n]{0,20}?mỗi\s+lần\s+(\d+(?:[.,]\d+)?)\s*(tỷ|triệu|nghìn|ngàn)", re.IGNORECASE
)
_QUESTION_AMOUNT_RE = re.compile(r"(\d+(?:[.,]\d+)?)\s*(tỷ|triệu|nghìn|ngàn)\b", re.IGNORECASE)
_LEADS_WITH_YES_RE = re.compile(r"^\W*(?:có|đúng)\b", re.IGNORECASE)
_PER_PERSON_CAP_RE = re.compile(
    r"không\s+quá\s+(\d+(?:[.,]\d+)?)\s*triệu\s+đồng\s*/\s*(?:01\s+|1\s+)?người\s*/\s*năm", re.IGNORECASE
)


def _topic_phrases(text: str, size: int) -> set[str]:
    """Word n-grams of the text that contain at least one topic word."""
    words = _WORD_RE.findall((text or "").lower())
    grams = (words[i:i + size] for i in range(len(words) - size + 1))
    return {" ".join(g) for g in grams if not all(w in _GENERIC_WORDS for w in g)}


def _vnd(raw: str, unit: str) -> float | None:
    value = parse_numeric_scalar(raw.replace(",", ".") if re.fullmatch(r"\d+,\d+", raw) else raw)
    return value * UNIT_SCALE_VND[unit.lower()] if value is not None else None


def _non_deductible_items(chunk_text: str) -> tuple[list[str], str]:
    """List items of a retrieved chunk that the law marks as wholly non-deductible, plus their intro lines."""
    under_heading = bool(_NON_DEDUCTIBLE_HEADING_RE.search(chunk_text))
    lines = chunk_text.split("\n", 1)
    # Drop the "Document — Điều N. Title — Khoản M" breadcrumb line so its words do not match the question.
    body = lines[1] if len(lines) == 2 and " — " in lines[0] else chunk_text
    items, intros = [], []
    for item in _LIST_ITEM_SPLIT_RE.split(body):
        item = item.strip()
        # An intro such as "Chi khấu hao ... thuộc một trong các trường hợp sau:" is not an item (PV-06).
        if item.endswith(":"):
            intros.append(item)
            continue
        if len(item) < 20 or _PARTIAL_CAP_ITEM_RE.search(item):
            continue
        if under_heading or _NON_DEDUCTIBLE_RE.search(item):
            items.append(item)
    return items, " ".join(intros)


def contradicts_non_deductible_rule(question: str, conclusion: str, retrieved_chunks: list) -> str | None:
    """Return a retry note when the conclusion calls an expense deductible against a retrieved rule (task 20).

    CP-05 late-payment interest and CP-13 interest on unpaid charter capital are listed as non-deductible;
    CP-03 cash payments to one seller add up above the cash threshold; CP-08 exceeds a per-person yearly cap.
    """
    q_low = (question or "").lower()
    for word, law_word in _QUESTION_SYNONYMS:
        q_low = q_low.replace(word, law_word)
    body = CITATION_MARKER_RE.sub(" ", conclusion or "")
    if not _DEDUCTIBILITY_QUESTION_RE.search(q_low):
        return None
    if not _AFFIRMS_DEDUCTIBLE_RE.search(body) or _DENIES_DEDUCTIBLE_RE.search(body):
        return None
    q_trigrams, q_bigrams = _topic_phrases(q_low, 3), _topic_phrases(q_low, 2)

    if _YES_NO_DEDUCTIBLE_RE.search(q_low):
        for hit in retrieved_chunks or []:
            text = str((hit.payload or {}).get("text_content") or "")
            items, intro = _non_deductible_items(text)
            for item in items:
                # The shared phrase must name this case, not the intro all cases share (PV-06: "khấu hao tài sản cố định").
                if (q_trigrams & _topic_phrases(item, 3)) - _topic_phrases(intro, 3):
                    quote = item if len(item) <= 220 else item[:220].rsplit(" ", 1)[0] + " ..."
                    return (
                        "Kết luận trước nói khoản chi được trừ, nhưng đoạn căn cứ liệt kê khoản này là KHÔNG được trừ: "
                        f"\"{quote}\". Hãy kết luận không được trừ, trích đúng đoạn căn cứ đó."
                    )

    law_text = _chunks_text(retrieved_chunks)
    law_low = law_text.lower()

    amounts = [_vnd(raw, unit) for raw, unit in _QUESTION_AMOUNT_RE.findall(q_low)]
    asked = max((a for a in amounts if a is not None), default=None)
    if asked is not None:
        for cap_match in _PER_PERSON_CAP_RE.finditer(law_text):
            context = law_text[max(0, cap_match.start() - 200):cap_match.start()]
            cap = _vnd(cap_match.group(1), "triệu")
            if cap is not None and asked > cap and q_bigrams & _topic_phrases(context, 2):
                return (
                    f"Kết luận trước cho trừ toàn bộ {asked / 1_000_000:g} triệu đồng, nhưng đoạn căn cứ chỉ cho trừ "
                    f"không quá {cap / 1_000_000:g} triệu đồng/người/năm. Hãy nêu mức được trừ tối đa và phần vượt "
                    "không được trừ."
                )

    # Purchases from a seller only; "chi tiền mặt mua đồng phục cho nhân viên" is a per-person cap question (CP-08).
    buys_from_seller = bool(re.search(r"\bngười\s+bán\b|\bhóa\s+đơn\b", q_low) or _REPEATED_PAYMENT_RE.search(q_low))
    if (
        buys_from_seller
        and "tiền mặt" in q_low
        and "không dùng tiền mặt" in law_low
        # Naming the condition is enough only when the answer does not open with a plain yes (CP-03).
        and ("không dùng tiền mặt" not in body.lower() or _LEADS_WITH_YES_RE.search(body))
    ):
        threshold_match = _CASH_THRESHOLD_RE.search(law_text)
        repeated = _REPEATED_PAYMENT_RE.search(q_low)
        if repeated:
            each = _vnd(repeated.group(2), repeated.group(3))
            total = each * int(repeated.group(1)) if each is not None else None
        else:
            amounts = [_vnd(raw, unit) for raw, unit in _QUESTION_AMOUNT_RE.findall(q_low)]
            total = max((a for a in amounts if a is not None), default=None)
        threshold = _vnd(threshold_match.group(1), "triệu") if threshold_match else None
        if total is not None and threshold is not None and total >= threshold:
            return (
                f"Kết luận trước cho trừ khoản chi trả bằng tiền mặt, nhưng tổng số tiền ({total / 1_000_000:g} triệu đồng) "
                f"từ {threshold / 1_000_000:g} triệu đồng trở lên thì chỉ được trừ khi có chứng từ thanh toán "
                "không dùng tiền mặt theo đoạn căn cứ. Hãy kết luận không được trừ và nêu điều kiện đó."
            )
    return None


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
