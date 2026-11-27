import re
from typing import Any

from app.core.cit_math import parse_numeric_scalar, resolve_statutory_cit_rate

REVENUE_KEYS = {"revenue", "totalrevenue", "doanhthu", "tongdoanhthu"}
EXPENSE_KEYS = {
    "deductibleexpenses", "deductibleexpense", "expenses",
    "totalexpenses", "chiphiduoctru", "tongchiphi",
}
ASSESSABLE_INCOME_KEYS = {"assessableincome", "thunhapchiuthue"}
TAXABLE_INCOME_KEYS = {"taxableincome", "thunhaptinhthue"}
EXEMPT_INCOME_KEYS = {"exemptincome", "thunhapmienthue"}
LOSS_KEYS = {
    "losscarryover", "carriedforwardloss", "priorloss",
    "priorperiodloss", "loketchuyen", "chuyenlo", "lonamtruoc",
}
TAX_RATE_KEYS = {"taxrate", "citrate", "thuesuat", "thuesuattndn"}
TAX_AMOUNT_KEYS = {
    "taxamount", "taxpayable", "citamount", "citpayable",
    "sothuephainop", "thuephainop", "thuetndnphainop", "sothuetndn",
}
LEGAL_FIELD_KEYWORDS = (
    "legal_basis", "legalbasis", "legal_reference", "legalreference",
    "can_cu_phap_ly", "cancuphaply", "co_so_phap_ly", "cosophaply",
    "căn cứ pháp lý", "cơ sở pháp lý", "căn cứ luật",
)


def canonical_key(name: Any) -> str:
    return re.sub(r"[^a-z0-9]", "", str(name or "").strip().lower())


def is_non_empty_value(value: Any) -> bool:
    if value is None:
        return False
    if isinstance(value, str):
        return bool(value.strip())
    if isinstance(value, (list, dict)):
        return len(value) > 0
    return True


def extract_template_fields(template_schema: Any) -> list[dict[str, Any]]:
    if isinstance(template_schema, list):
        return [item for item in template_schema if isinstance(item, dict)]
    if isinstance(template_schema, dict):
        if isinstance(template_schema.get("fields"), list):
            return [item for item in template_schema["fields"] if isinstance(item, dict)]
        properties = template_schema.get("properties")
        required_set = set(template_schema.get("required") or [])
        if isinstance(properties, dict):
            fields: list[dict[str, Any]] = []
            for key, spec in properties.items():
                field_obj = dict(spec) if isinstance(spec, dict) else {}
                field_obj.setdefault("id", key)
                field_obj.setdefault("required", key in required_set)
                fields.append(field_obj)
            return fields
    return []


def is_legal_basis_field(field: dict[str, Any]) -> bool:
    candidates = [str(field.get(k) or "").strip().lower() for k in ("id", "name", "key", "label", "group")]
    return any(kw in text for text in candidates if text for kw in LEGAL_FIELD_KEYWORDS)


def lookup_field_value(draft_content: dict[str, Any], field: dict[str, Any]) -> Any:
    keys = [str(field.get(k)).strip() for k in ("id", "name", "key", "label") if field.get(k)]
    lowered_map = {str(k).strip().lower(): v for k, v in draft_content.items()}
    for key in keys:
        if key in draft_content:
            return draft_content[key]
        if key.lower() in lowered_map:
            return lowered_map[key.lower()]

    sections = draft_content.get("sections")
    if isinstance(sections, list):
        lowered_keys = {k.lower() for k in keys}
        for section in sections:
            if not isinstance(section, dict):
                continue
            sec_id = str(section.get("id") or "").strip().lower()
            sec_title = str(section.get("title") or "").strip().lower()
            if sec_id in lowered_keys or sec_title in lowered_keys:
                return section.get("content")
    return None


def lookup_numeric_by_keys(snapshot: dict[str, Any], target_keys: set[str]) -> float | None:
    for key, val in snapshot.items():
        if canonical_key(key) in target_keys:
            parsed = parse_numeric_scalar(val)
            if parsed is not None:
                return parsed
    return None


def draft_involves_tax_rate(snapshot_data: dict, template_schema: Any) -> bool:
    target_keys = TAX_AMOUNT_KEYS | TAX_RATE_KEYS | TAXABLE_INCOME_KEYS | ASSESSABLE_INCOME_KEYS
    if any(
        canonical_key(f.get("id") or f.get("name") or f.get("key")) in target_keys
        for f in extract_template_fields(template_schema)
    ):
        return True
    return isinstance(snapshot_data, dict) and any(
        canonical_key(k) in target_keys for k in snapshot_data.keys()
    )


def derive_cit_calculation(
    snapshot_data: dict,
    legal_context: str,
    retrieved_hits: list | None = None,
) -> dict[str, int | float]:
    """Deterministically compute taxable income and CIT payable when snapshot provides complete inputs."""
    if not isinstance(snapshot_data, dict) or not legal_context or not legal_context.strip():
        return {}

    exempt_income = lookup_numeric_by_keys(snapshot_data, EXEMPT_INCOME_KEYS) or 0.0
    loss_carryover = lookup_numeric_by_keys(snapshot_data, LOSS_KEYS) or 0.0
    taxable_income = lookup_numeric_by_keys(snapshot_data, TAXABLE_INCOME_KEYS)
    assessable_income = lookup_numeric_by_keys(snapshot_data, ASSESSABLE_INCOME_KEYS)
    revenue = lookup_numeric_by_keys(snapshot_data, REVENUE_KEYS)
    expenses = lookup_numeric_by_keys(snapshot_data, EXPENSE_KEYS)

    net_taxable: float | None = None
    if taxable_income is not None:
        net_taxable = max(taxable_income - loss_carryover, 0.0)
    elif assessable_income is not None:
        net_taxable = max(assessable_income - exempt_income - loss_carryover, 0.0)
    elif revenue is not None and expenses is not None:
        net_taxable = max(revenue - expenses - exempt_income - loss_carryover, 0.0)

    if net_taxable is None:
        return {}

    combined_law = " ".join(
        [legal_context]
        + [
            str((getattr(hit, "payload", None) or {}).get("text_content") or "")
            for hit in (retrieved_hits or [])
        ]
    )
    explicit_rate = lookup_numeric_by_keys(snapshot_data, TAX_RATE_KEYS)
    rate = resolve_statutory_cit_rate(
        revenue_vnd=revenue,
        law_text=combined_law,
        explicit_rate=explicit_rate,
        allow_standard_without_revenue_when_sme_present=False,
    )
    if rate is None:
        return {}

    raw_tax = net_taxable * (rate / 100.0)
    tax_val = int(round(raw_tax)) if abs(raw_tax - round(raw_tax)) < 1e-6 else round(raw_tax, 2)
    net_val = int(round(net_taxable)) if abs(net_taxable - round(net_taxable)) < 1e-6 else round(net_taxable, 2)
    rate_val = int(rate) if float(rate).is_integer() else rate

    return {
        "calculated_taxable_income": net_val,
        "applicable_tax_rate_percent": rate_val,
        "calculated_tax_amount": tax_val,
    }
