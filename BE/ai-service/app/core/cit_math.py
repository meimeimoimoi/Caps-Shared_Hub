import re
from typing import Any

NUMBER_TOKEN_RE = re.compile(r"\b\d{1,3}(?:[.,]\d{3})+\b|\b\d+(?:[.,]\d+)?\b")
GROUPED_THOUSANDS_RE = re.compile(r"^\d{1,3}(?:[.,]\d{3})+$")
SCALED_MONEY_SPAN_RE = re.compile(
    r"\b(\d{1,3}(?:[.,]\d{3})+|\d+(?:[.,]\d+)?)\s*(tỷ|triệu|nghìn|ngàn)(?:\s+đồng|\s+vnd)?\b",
    re.IGNORECASE,
)

UNIT_SCALE_VND: dict[str, float] = {
    "tỷ": 1_000_000_000.0,
    "triệu": 1_000_000.0,
    "nghìn": 1_000.0,
    "ngàn": 1_000.0,
    "đồng": 1.0,
    "vnd": 1.0,
    # Unaccented spellings typed without Vietnamese input ("doanh thu 2 ty", TS-05).
    "ty": 1_000_000_000.0,
    "trieu": 1_000_000.0,
    "nghin": 1_000.0,
    "ngan": 1_000.0,
    "dong": 1.0,
}


def normalize_number_token(raw: str) -> str:
    """Normalize integer, thousands-grouped, and decimal tokens into a canonical string."""
    cleaned = raw.strip()
    if GROUPED_THOUSANDS_RE.fullmatch(cleaned):
        digits = re.sub(r"[.,]", "", cleaned)
        return digits.lstrip("0") or "0"
    if cleaned.isdigit():
        return cleaned.lstrip("0") or "0"
    normalized = cleaned.replace(",", ".")
    if "." in normalized:
        normalized = normalized.rstrip("0").rstrip(".")
    return normalized.lstrip("0") or "0"


def parse_numeric_scalar(value: Any) -> float | None:
    """Parse int, float, or Vietnamese/English formatted number strings into float."""
    if isinstance(value, bool) or value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    if not isinstance(value, str):
        return None
    cleaned = value.strip().rstrip("%").strip()
    if not cleaned:
        return None
    if GROUPED_THOUSANDS_RE.fullmatch(cleaned):
        return float(re.sub(r"[.,]", "", cleaned))
    try:
        return float(cleaned.replace(",", "."))
    except ValueError:
        return None


def money_representations(amount_vnd: float, *, include_comma_decimal: bool = False) -> set[str]:
    """Return normalized representations of a VND amount across đồng, nghìn, triệu, and tỷ."""
    reps: set[str] = set()
    divisors = (
        (1.0, 1_000.0, 1_000_000.0, 1_000_000_000.0)
        if include_comma_decimal
        else (1.0, 1_000_000.0, 1_000_000_000.0)
    )
    for divisor in divisors:
        scaled = amount_vnd / divisor
        if scaled < 0.001:
            continue
        rounded = round(scaled, 4)
        if abs(rounded - round(rounded)) < 1e-6:
            reps.add(str(int(round(rounded))))
        else:
            clean = f"{rounded:.4f}".rstrip("0").rstrip(".")
            reps.add(normalize_number_token(clean) if not include_comma_decimal else clean)
            if include_comma_decimal:
                reps.add(clean.replace(".", ","))
    return reps


def format_vnd_human(amount_vnd: float) -> str:
    """Format a VND amount into natural Vietnamese units (tỷ đồng, triệu đồng, or đồng)."""
    if amount_vnd >= 1_000_000_000 and amount_vnd % 1_000_000 == 0:
        in_ty = amount_vnd / 1_000_000_000
        if abs(in_ty - round(in_ty)) < 1e-6:
            return f"{int(round(in_ty))} tỷ đồng"
        return f"{f'{in_ty:.3f}'.rstrip('0').rstrip('.').replace('.', ',')} tỷ đồng"
    in_trieu = amount_vnd / 1_000_000
    if amount_vnd >= 1_000_000 and abs(in_trieu * 100 - round(in_trieu * 100)) < 1e-4:
        if abs(in_trieu - round(in_trieu)) < 1e-6:
            return f"{int(round(in_trieu))} triệu đồng"
        return f"{f'{in_trieu:.2f}'.rstrip('0').rstrip('.').replace('.', ',')} triệu đồng"
    return f"{int(round(amount_vnd)):,}".replace(",", ".") + " đồng"


def resolve_statutory_cit_rate(
    revenue_vnd: float | None,
    law_text: str,
    explicit_rate: float | None = None,
    *,
    allow_standard_without_revenue_when_sme_present: bool = True,
) -> float | None:
    """Resolve CIT rate (%) from explicit input or statutory revenue brackets in retrieved law."""
    if explicit_rate is not None and 0 < explicit_rate <= 100:
        return explicit_rate * 100 if explicit_rate < 1 else explicit_rate

    lowered = (law_text or "").lower()
    if not lowered.strip():
        return None

    has_sme_15 = "15%" in lowered and ("03 tỷ" in lowered or "3 tỷ" in lowered)
    has_sme_17 = "17%" in lowered and "50 tỷ" in lowered
    has_standard_20 = "20%" in lowered

    if revenue_vnd is not None:
        if revenue_vnd <= 3_000_000_000 and has_sme_15:
            return 15.0
        if 3_000_000_000 < revenue_vnd <= 50_000_000_000 and has_sme_17:
            return 17.0
        if revenue_vnd > 50_000_000_000 and has_standard_20:
            return 20.0
        if has_standard_20 and not (has_sme_15 or has_sme_17):
            return 20.0
        return None

    if has_standard_20 and (
        not (has_sme_15 or has_sme_17) or allow_standard_without_revenue_when_sme_present
    ):
        return 20.0
    return None
