import re

# Legal reference mentions (document type + number, "Điều N", or a bare "N/YYYY/<suffix>" number).
LEGAL_REF_RE = re.compile(
    r"(?:"
    r"\b(?:nghị\s+định|thông\s+tư|quyết\s+định|luật|nghị\s+quyết)\s+(?:số\s+)?\d+(?:/\d{4})?(?:/[\w\-]+)?\b"
    r"|\bđiều\s+\d+\b"
    r"|\b\d+/\d{4}/(?:nđ-cp|nd-cp|tt-btc|qh\d+|qđ-ttg|qd-ttg)\b"
    r")",
    re.IGNORECASE,
)

# Document numbers such as "320/2025/NĐ-CP" or "43/2026"; the lookbehind skips dates like "15/12/2025".
_DOCUMENT_NUMBER_RE = re.compile(r"(?<![\d/])(\d{1,4})/((?:19|20)\d{2})(?!\d)")
# "tháng 8/2026" or "quý 3/2026" is a month or quarter, not document number 8/2026.
_MONTH_OR_QUARTER_RE = re.compile(r"\b(?:tháng|quý)\s+\d{1,2}/(?:19|20)\d{2}(?!\d)", re.IGNORECASE)


def extract_document_numbers(text: str | None) -> set[str]:
    """Return normalized "number/year" keys of legal document numbers mentioned in the text."""
    if not text:
        return set()
    text = _MONTH_OR_QUARTER_RE.sub(" ", text)
    return {f"{int(number)}/{year}" for number, year in _DOCUMENT_NUMBER_RE.findall(text)}
