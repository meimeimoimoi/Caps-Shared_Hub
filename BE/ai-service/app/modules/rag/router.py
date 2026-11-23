import calendar
from datetime import date
import re

from app.core.ai_response import parse_ai_response
from app.core.models import llm_model
from app.modules.rag.prompts import build_scope_prompt
from app.schemas.ai_results import ScopeAnalysis

_MIN_YEAR = 1900
_MAX_YEAR = 2100

_YEAR_ONLY_RE = re.compile(r"^(?:năm\s+)?(\d{4})$", re.IGNORECASE)
_QUARTER_YEAR_RE = re.compile(
    r"^(?:q|quý)\s*([1-4])\s*(?:[/\-]|\s+năm\s+|\s+)\s*(\d{4})$",
    re.IGNORECASE,
)
_YEAR_QUARTER_RE = re.compile(
    r"^(\d{4})\s*[/\-\s]\s*(?:q|quý)\s*([1-4])$",
    re.IGNORECASE,
)
_YEAR_MONTH_RE = re.compile(r"^(\d{4})\s*[/\-]\s*(\d{1,2})$")
_MONTH_YEAR_RE = re.compile(
    r"^(?:tháng\s+)?(\d{1,2})\s*(?:[/\-]|\s+năm\s+)\s*(\d{4})$",
    re.IGNORECASE,
)
_DMY_RANGE_RE = re.compile(
    r"^(?:từ\s+(?:ngày\s+)?)?(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})\s*(?:\.\.|đến(?:\s+ngày)?|-|–)\s*(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})$",
    re.IGNORECASE,
)
_ISO_RANGE_WORDS_RE = re.compile(
    r"^(?:từ\s+(?:ngày\s+)?)?(\d{4}-\d{2}-\d{2})\s*(?:\.\.|đến(?:\s+ngày)?)\s*(\d{4}-\d{2}-\d{2})$",
    re.IGNORECASE,
)
_DMY_SINGLE_RE = re.compile(r"^(?:ngày\s+)?(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})$", re.IGNORECASE)

# Question extractors require explicit period keywords so citation numbers like "320/2025/ND-CP" are ignored.
_Q_DMY_RANGE_RE = re.compile(
    r"\btừ\s+(?:ngày\s+)?(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})\s+(?:đến|tới)(?:\s+ngày)?\s+(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})\b",
    re.IGNORECASE,
)
_Q_ISO_RANGE_RE = re.compile(
    r"\btừ\s+(?:ngày\s+)?(\d{4}-\d{2}-\d{2})\s+(?:đến|tới)(?:\s+ngày)?\s+(\d{4}-\d{2}-\d{2})\b",
    re.IGNORECASE,
)
_Q_MONTH_RANGE_RE = re.compile(
    r"\btừ\s+tháng\s+(\d{1,2})(?:\s*(?:[/\-]|\s+năm\s+)\s*(\d{4}))?\s+(?:đến|tới)\s+(?:tháng\s+)?(\d{1,2})\s*(?:[/\-]|\s+năm\s+)\s*(\d{4})\b",
    re.IGNORECASE,
)
_Q_QUARTER_RE = re.compile(
    r"(?:\b(?:quý|q)\s*([1-4])\s*(?:[/\-]|\s+năm\s+|\s+)\s*(\d{4})\b"
    r"|\b(\d{4})\s*[/\-]\s*(?:q|quý)\s*([1-4])\b)",
    re.IGNORECASE,
)
_Q_MONTH_RE = re.compile(
    r"\btháng\s+(\d{1,2})\s*(?:[/\-]|\s+năm\s+)\s*(\d{4})\b",
    re.IGNORECASE,
)
_Q_YEAR_RE = re.compile(
    r"\b(?:năm|kỳ(?:\s+tính\s+thuế)?)\s+(\d{4})\b",
    re.IGNORECASE,
)

_NON_CIT_KEYWORDS = (
    "giảm trừ gia cảnh",
    "người phụ thuộc",
    "thuế tncn",
    "thu nhập cá nhân",
    "hộ kinh doanh",
    "cá nhân kinh doanh",
    "thuế khoán",
)
_CIT_CONTEXT_KEYWORDS = (
    "tndn",
    "thu nhập doanh nghiệp",
    "cit",
    "doanh nghiệp",
)
_PROMPT_LEAK_MARKERS = (
    "kỳ thuế do người dùng cung cấp",
    "kỳ thuế đi kèm",
    "user_tax_period",
    "period_start",
    "period_end",
)


def _is_valid_year(year: int) -> bool:
    return _MIN_YEAR <= year <= _MAX_YEAR


def _year_range(year: int) -> tuple[date, date] | None:
    if not _is_valid_year(year):
        return None
    return date(year, 1, 1), date(year, 12, 31)


def _quarter_range(year: int, quarter: int) -> tuple[date, date] | None:
    if not _is_valid_year(year) or not 1 <= quarter <= 4:
        return None
    start_month = (quarter - 1) * 3 + 1
    end_month = start_month + 2
    last_day = calendar.monthrange(year, end_month)[1]
    return date(year, start_month, 1), date(year, end_month, last_day)


def _month_range(year: int, month: int) -> tuple[date, date] | None:
    if not _is_valid_year(year) or not 1 <= month <= 12:
        return None
    last_day = calendar.monthrange(year, month)[1]
    return date(year, month, 1), date(year, month, last_day)


def _month_span_range(
    start_year: int, start_month: int, end_year: int, end_month: int
) -> tuple[date, date] | None:
    start_span = _month_range(start_year, start_month)
    end_span = _month_range(end_year, end_month)
    if not start_span or not end_span or start_span[0] > end_span[1]:
        return None
    return start_span[0], end_span[1]


def _build_date(year: int, month: int, day: int) -> date | None:
    if not _is_valid_year(year):
        return None
    try:
        return date(year, month, day)
    except ValueError:
        return None


def _parse_iso_date(value: str) -> date | None:
    try:
        parsed = date.fromisoformat(value.strip())
    except ValueError:
        return None
    return parsed if _is_valid_year(parsed.year) else None


def parse_tax_period(period_text: str | None) -> tuple[date, date] | None:
    """Parse explicit tax period expressions (year, quarter, month, ISO date, or date range) into inclusive dates."""
    if not period_text or not period_text.strip():
        return None

    text = " ".join(period_text.strip().split())

    if match := _ISO_RANGE_WORDS_RE.fullmatch(text):
        start = _parse_iso_date(match.group(1))
        end = _parse_iso_date(match.group(2))
        return (start, end) if start and end and start <= end else None

    if match := _DMY_RANGE_RE.fullmatch(text):
        start = _build_date(int(match.group(3)), int(match.group(2)), int(match.group(1)))
        end = _build_date(int(match.group(6)), int(match.group(5)), int(match.group(4)))
        return (start, end) if start and end and start <= end else None

    if ".." in text:
        return None

    single_date = _parse_iso_date(text)
    if single_date:
        return single_date, single_date

    if match := _DMY_SINGLE_RE.fullmatch(text):
        d = _build_date(int(match.group(3)), int(match.group(2)), int(match.group(1)))
        return (d, d) if d else None

    if match := _YEAR_ONLY_RE.fullmatch(text):
        return _year_range(int(match.group(1)))

    if match := _QUARTER_YEAR_RE.fullmatch(text):
        return _quarter_range(int(match.group(2)), int(match.group(1)))

    if match := _YEAR_QUARTER_RE.fullmatch(text):
        return _quarter_range(int(match.group(1)), int(match.group(2)))

    if match := _YEAR_MONTH_RE.fullmatch(text):
        return _month_range(int(match.group(1)), int(match.group(2)))

    if match := _MONTH_YEAR_RE.fullmatch(text):
        return _month_range(int(match.group(2)), int(match.group(1)))

    return None


def _extract_clarification_suffix(question: str) -> str | None:
    match = re.search(r"(?:^|\n)\s*Clarification:\s*(.+)$", question, re.IGNORECASE | re.DOTALL)
    if not match:
        return None
    return match.group(1).strip() or None


def _extract_unique_period_from_question(question: str) -> tuple[date, date] | None:
    """Return a single unambiguous period from the question, or None when absent or spanning multiple years."""
    if not question:
        return None

    # Prefer explicit period ranges when present (Vietnamese DD/MM/YYYY, ISO, or month-to-month).
    explicit_ranges: set[tuple[date, date]] = set()
    for d1, m1, y1, d2, m2, y2 in _Q_DMY_RANGE_RE.findall(question):
        start = _build_date(int(y1), int(m1), int(d1))
        end = _build_date(int(y2), int(m2), int(d2))
        if start and end and start <= end:
            explicit_ranges.add((start, end))

    for s1, s2 in _Q_ISO_RANGE_RE.findall(question):
        start = _parse_iso_date(s1)
        end = _parse_iso_date(s2)
        if start and end and start <= end:
            explicit_ranges.add((start, end))

    for m1, y1, m2, y2 in _Q_MONTH_RANGE_RE.findall(question):
        end_year = int(y2)
        start_year = int(y1) if y1 else end_year
        if span := _month_span_range(start_year, int(m1), end_year, int(m2)):
            explicit_ranges.add(span)

    if len(explicit_ranges) == 1:
        return next(iter(explicit_ranges))
    if len(explicit_ranges) > 1:
        return None

    quarter_ranges: set[tuple[date, date]] = set()
    for q1, y1, y2, q2 in _Q_QUARTER_RE.findall(question):
        year = int(y1 or y2)
        quarter = int(q1 or q2)
        if span := _quarter_range(year, quarter):
            quarter_ranges.add(span)

    month_ranges: set[tuple[date, date]] = set()
    for month_str, year_str in _Q_MONTH_RE.findall(question):
        if span := _month_range(int(year_str), int(month_str)):
            month_ranges.add(span)

    year_ranges: set[tuple[date, date]] = set()
    for year_str in _Q_YEAR_RE.findall(question):
        if span := _year_range(int(year_str)):
            year_ranges.add(span)

    mentioned_years = {
        span[0].year for span in (*quarter_ranges, *month_ranges, *year_ranges)
    }
    if len(mentioned_years) != 1:
        return None

    if len(month_ranges) == 1 and not quarter_ranges:
        return next(iter(month_ranges))
    if len(quarter_ranges) == 1 and not month_ranges:
        return next(iter(quarter_ranges))
    if not quarter_ranges and not month_ranges and len(year_ranges) == 1:
        return next(iter(year_ranges))
    return None


def _is_obvious_non_cit_question(question: str) -> bool:
    """Catch unambiguous PIT/household-business queries when no CIT context keyword is present."""
    normalized = " ".join(question.lower().split())
    if any(cit_kw in normalized for cit_kw in _CIT_CONTEXT_KEYWORDS):
        return False
    return any(non_cit_kw in normalized for non_cit_kw in _NON_CIT_KEYWORDS)


def _sanitize_clarification_msg(msg: str | None) -> str | None:
    if not msg:
        return None
    cleaned = " ".join(msg.strip().split())
    if not cleaned or cleaned.lower() in ("null", "none", "..."):
        return None
    lowered = cleaned.lower()
    if any(marker in lowered for marker in _PROMPT_LEAK_MARKERS):
        return None
    return cleaned


def _format_period_label(span: tuple[date, date]) -> str:
    start, end = span
    if start == date(start.year, 1, 1) and end == date(start.year, 12, 31):
        return f"năm {start.year}"
    if start == end:
        return start.strftime("%d/%m/%Y")
    return f"{start.strftime('%d/%m/%Y')} đến {end.strftime('%d/%m/%Y')}"


class ScopeRouter:
    """Determines whether a question is in CIT scope and resolves its applicable tax period."""

    @staticmethod
    def analyze(question: str, user_tax_period: str | None = None) -> ScopeAnalysis:
        if _is_obvious_non_cit_question(question):
            return ScopeAnalysis(
                is_cit=False,
                period_start=None,
                period_end=None,
                needs_clarification=False,
                clarification_msg=None,
            )

        prompt = build_scope_prompt(question, user_tax_period)
        res = llm_model.invoke(prompt)
        analysis = parse_ai_response(res.content, ScopeAnalysis)
        if not analysis.is_cit:
            return analysis

        sanitized_msg = _sanitize_clarification_msg(analysis.clarification_msg)
        explicit_period = parse_tax_period(user_tax_period)
        clarification_suffix = _extract_clarification_suffix(question)
        clarification_period = (
            parse_tax_period(clarification_suffix)
            or (_extract_unique_period_from_question(clarification_suffix) if clarification_suffix else None)
        )
        question_only = (
            question[: question.lower().rfind("clarification:")].strip()
            if clarification_suffix
            else question
        )
        question_period = _extract_unique_period_from_question(question_only)

        # Follow-up clarification from the user resolves ambiguity directly without conflict.
        if clarification_period is not None:
            resolved_period = clarification_period
        elif explicit_period is not None and question_period is not None and explicit_period != question_period:
            return ScopeAnalysis(
                is_cit=True,
                period_start=None,
                period_end=None,
                needs_clarification=True,
                clarification_msg=(
                    f"Câu hỏi của bạn nhắc tới kỳ {_format_period_label(question_period)}, "
                    f"nhưng kỳ thuế đang chọn là {_format_period_label(explicit_period)}. "
                    "Bạn muốn tra cứu theo kỳ nào?"
                ),
            )
        else:
            resolved_period = explicit_period
            if resolved_period is None and (
                analysis.needs_clarification
                or analysis.period_start is None
                or analysis.period_end is None
            ):
                resolved_period = question_period

        if resolved_period is not None:
            start, end = resolved_period
            return analysis.model_copy(
                update={
                    "period_start": start,
                    "period_end": end,
                    "needs_clarification": False,
                    "clarification_msg": None,
                }
            )

        if sanitized_msg != analysis.clarification_msg:
            return analysis.model_copy(update={"clarification_msg": sanitized_msg})

        return analysis
