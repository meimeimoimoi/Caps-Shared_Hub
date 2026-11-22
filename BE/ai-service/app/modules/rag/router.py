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

# Question extractors require explicit period keywords so citation numbers like "320/2025/ND-CP" are ignored.
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


def _parse_iso_date(value: str) -> date | None:
    try:
        return date.fromisoformat(value.strip())
    except ValueError:
        return None


def parse_tax_period(period_text: str | None) -> tuple[date, date] | None:
    """Parse explicit tax period expressions (year, quarter, month, ISO date, or start..end) into inclusive dates."""
    if not period_text or not period_text.strip():
        return None

    text = " ".join(period_text.strip().split())

    if ".." in text:
        parts = text.split("..")
        if len(parts) != 2:
            return None
        start = _parse_iso_date(parts[0])
        end = _parse_iso_date(parts[1])
        if start and end and start <= end:
            return start, end
        return None

    single_date = _parse_iso_date(text)
    if single_date:
        return single_date, single_date

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


def _extract_unique_period_from_question(question: str) -> tuple[date, date] | None:
    """Return a single unambiguous period from the question, or None when absent or spanning multiple years."""
    if not question:
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


class ScopeRouter:
    """Determines whether a question is in CIT scope and resolves its applicable tax period."""

    @staticmethod
    def analyze(question: str, user_tax_period: str | None = None) -> ScopeAnalysis:
        prompt = build_scope_prompt(question, user_tax_period)
        res = llm_model.invoke(prompt)
        analysis = parse_ai_response(res.content, ScopeAnalysis)
        if not analysis.is_cit:
            return analysis

        resolved_period = parse_tax_period(user_tax_period)
        if resolved_period is None and (
            analysis.needs_clarification
            or analysis.period_start is None
            or analysis.period_end is None
        ):
            resolved_period = _extract_unique_period_from_question(question)

        if resolved_period is None:
            return analysis

        start, end = resolved_period
        return analysis.model_copy(
            update={
                "period_start": start,
                "period_end": end,
                "needs_clarification": False,
                "clarification_msg": None,
            }
        )
