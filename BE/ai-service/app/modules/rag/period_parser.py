import calendar
from datetime import date
import re

from app.core.text_utils import strip_vietnamese_accents

_MIN_YEAR = 1900
_MAX_YEAR = 2100

_YEAR_ONLY_RE = re.compile(r"^(?:nam\s+|(?:tax\s+|fiscal\s+)?year\s+|fy\s*)?(\d{4})$", re.IGNORECASE)
_QUARTER_YEAR_RE = re.compile(
    r"^(?:q|quy)\s*([1-4])\s*(?:[/\-]|\s+(?:nam|of)\s+|\s+)\s*(\d{4})$", re.IGNORECASE
)
_YEAR_QUARTER_RE = re.compile(r"^(\d{4})\s*[/\-\s]\s*(?:q|quy)\s*([1-4])$", re.IGNORECASE)
_YEAR_MONTH_RE = re.compile(r"^(\d{4})\s*[/\-]\s*(\d{1,2})$")
_MONTH_YEAR_RE = re.compile(r"^(?:thang\s+|month\s+)?(\d{1,2})\s*(?:[/\-]|\s+nam\s+)\s*(\d{4})$", re.IGNORECASE)
_DMY_RANGE_RE = re.compile(
    r"^(?:tu\s+(?:ngay\s+)?)?(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})\s*(?:\.\.|den(?:\s+ngay)?|-|–)\s*(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})$",
    re.IGNORECASE,
)
_ISO_RANGE_WORDS_RE = re.compile(
    r"^(?:tu\s+(?:ngay\s+)?)?(\d{4}-\d{2}-\d{2})\s*(?:\.\.|den(?:\s+ngay)?)\s*(\d{4}-\d{2}-\d{2})$",
    re.IGNORECASE,
)
_DMY_SINGLE_RE = re.compile(r"^(?:ngay\s+)?(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})$", re.IGNORECASE)

# Question extractors operate on ASCII-folded text and require period keywords so "320/2025/ND-CP" is ignored.
_Q_DMY_RANGE_RE = re.compile(
    r"\btu\s+(?:ngay\s+)?(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})\s+(?:den|toi)(?:\s+ngay)?\s+(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})\b",
    re.IGNORECASE,
)
_Q_ISO_RANGE_RE = re.compile(
    r"\btu\s+(?:ngay\s+)?(\d{4}-\d{2}-\d{2})\s+(?:den|toi)(?:\s+ngay)?\s+(\d{4}-\d{2}-\d{2})\b",
    re.IGNORECASE,
)
_Q_MONTH_RANGE_RE = re.compile(
    r"\btu\s+thang\s+(\d{1,2})(?:\s*(?:[/\-]|\s+nam\s+)\s*(\d{4}))?\s+(?:den|toi)\s+(?:thang\s+)?(\d{1,2})\s*(?:[/\-]|\s+nam\s+)\s*(\d{4})\b",
    re.IGNORECASE,
)
_Q_QUARTER_RE = re.compile(
    r"(?:\b(?:quy|q)\s*([1-4])\s*(?:[/\-]|\s+nam\s+|\s+)\s*(\d{4})\b"
    r"|\b(\d{4})\s*[/\-]\s*(?:q|quy)\s*([1-4])\b)",
    re.IGNORECASE,
)
_Q_MONTH_RE = re.compile(r"\bthang\s+(\d{1,2})\s*(?:[/\-]|\s+nam\s+)\s*(\d{4})\b", re.IGNORECASE)
_Q_YEAR_RE = re.compile(
    r"(?<!viet\s)\b(?:"
    r"nam(?:\s+tinh\s+thue)?|ky(?:\s+tinh\s+thue)?"
    r"|(?:in|for)(?:\s+(?:(?:tax|fiscal)\s+)?year)?"
    r"|(?:tax|fiscal)\s+year"
    r")\s+(\d{4})\b",
    re.IGNORECASE,
)
_HISTORICAL_YEAR_CONTEXT_RE = re.compile(
    r"\b(?:"
    r"(?:chuyen\s+lo|khoan\s+lo|so\s+lo|bi\s+lo|lo)(?:\s+(?:phat\s+sinh|ket\s+chuyen|cua|tu))*"
    r"|(?:mua|dau\s+tu|thanh\s+lap|dua\s+vao\s+su\s+dung|ban\s+giao|ky\s+hop\s+dong|ban\s+hanh)"
    r"(?:\s+(?:tu|vao|trong))?"
    r")\s+(?:nam|ky)\s+\d{4}\b",
    re.IGNORECASE,
)


def _is_valid_year(year: int) -> bool:
    return _MIN_YEAR <= year <= _MAX_YEAR


def _year_range(year: int) -> tuple[date, date] | None:
    return (date(year, 1, 1), date(year, 12, 31)) if _is_valid_year(year) else None


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


def _month_span_range(start_year: int, start_month: int, end_year: int, end_month: int) -> tuple[date, date] | None:
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


def is_subperiod_of(inner: tuple[date, date], outer: tuple[date, date]) -> bool:
    """Return True when inner (e.g. Q1/2026 or 03/2026) falls completely inside outer (e.g. year 2026)."""
    return outer[0] <= inner[0] and inner[1] <= outer[1]


def format_period_label(span: tuple[date, date]) -> str:
    start, end = span
    if start == date(start.year, 1, 1) and end == date(start.year, 12, 31):
        return f"năm {start.year}"
    if start == end:
        return start.strftime("%d/%m/%Y")
    return f"{start.strftime('%d/%m/%Y')} đến {end.strftime('%d/%m/%Y')}"


def extract_clarification_suffix(question: str) -> str | None:
    match = re.search(r"(?:^|\n)\s*Clarification:\s*(.+)$", question, re.IGNORECASE | re.DOTALL)
    return match.group(1).strip() if match and match.group(1).strip() else None


def parse_tax_period(period_text: str | None) -> tuple[date, date] | None:
    """Parse explicit tax period expressions (year, quarter, month, ISO date, or date range) into inclusive dates."""
    if not period_text or not period_text.strip():
        return None

    text = " ".join(strip_vietnamese_accents(period_text).strip().split())
    if match := _ISO_RANGE_WORDS_RE.fullmatch(text):
        start, end = _parse_iso_date(match.group(1)), _parse_iso_date(match.group(2))
        return (start, end) if start and end and start <= end else None
    if match := _DMY_RANGE_RE.fullmatch(text):
        start = _build_date(int(match.group(3)), int(match.group(2)), int(match.group(1)))
        end = _build_date(int(match.group(6)), int(match.group(5)), int(match.group(4)))
        return (start, end) if start and end and start <= end else None
    if ".." in text:
        return None
    if single_date := _parse_iso_date(text):
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


def extract_unique_period_from_question(question: str) -> tuple[date, date] | None:
    """Return a single unambiguous target tax period from the question, ignoring historical carryover years."""
    if not question:
        return None

    cleaned_question = _HISTORICAL_YEAR_CONTEXT_RE.sub(" ", strip_vietnamese_accents(question))

    explicit_ranges: set[tuple[date, date]] = set()
    for d1, m1, y1, d2, m2, y2 in _Q_DMY_RANGE_RE.findall(cleaned_question):
        start, end = _build_date(int(y1), int(m1), int(d1)), _build_date(int(y2), int(m2), int(d2))
        if start and end and start <= end:
            explicit_ranges.add((start, end))
    for s1, s2 in _Q_ISO_RANGE_RE.findall(cleaned_question):
        start, end = _parse_iso_date(s1), _parse_iso_date(s2)
        if start and end and start <= end:
            explicit_ranges.add((start, end))
    for m1, y1, m2, y2 in _Q_MONTH_RANGE_RE.findall(cleaned_question):
        end_year = int(y2)
        start_year = int(y1) if y1 else end_year
        if span := _month_span_range(start_year, int(m1), end_year, int(m2)):
            explicit_ranges.add(span)

    if len(explicit_ranges) == 1:
        return next(iter(explicit_ranges))
    if len(explicit_ranges) > 1:
        return None

    quarter_ranges = {
        span
        for q1, y1, y2, q2 in _Q_QUARTER_RE.findall(cleaned_question)
        if (span := _quarter_range(int(y1 or y2), int(q1 or q2)))
    }
    month_ranges = {
        span
        for m_str, y_str in _Q_MONTH_RE.findall(cleaned_question)
        if (span := _month_range(int(y_str), int(m_str)))
    }
    year_ranges = {
        span
        for y_str in _Q_YEAR_RE.findall(cleaned_question)
        if (span := _year_range(int(y_str)))
    }

    mentioned_years = {span[0].year for span in (*quarter_ranges, *month_ranges, *year_ranges)}
    if len(mentioned_years) != 1:
        return None
    if len(month_ranges) == 1 and not quarter_ranges:
        return next(iter(month_ranges))
    if len(quarter_ranges) == 1 and not month_ranges:
        return next(iter(quarter_ranges))
    if not quarter_ranges and not month_ranges and len(year_ranges) == 1:
        return next(iter(year_ranges))
    return None
