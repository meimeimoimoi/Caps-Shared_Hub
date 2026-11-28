import hashlib
import json
from typing import Any

from app.core.ai_response import parse_ai_response
from app.core.cit_math import parse_numeric_scalar
from app.core.models import llm_model
from app.modules.drafting.prompts import NO_APPROVED_LEGAL_BASIS_NOTE, build_draft_prompt
from app.modules.drafting.tax_calculator import (
    ASSESSABLE_INCOME_KEYS,
    REVENUE_KEYS,
    TAX_AMOUNT_KEYS,
    TAX_RATE_KEYS,
    TAXABLE_INCOME_KEYS,
    canonical_key,
    derive_cit_calculation,
    draft_involves_tax_rate,
    extract_template_fields,
    is_legal_basis_field,
    is_non_empty_value,
    lookup_field_value,
    lookup_numeric_by_keys,
)
from app.modules.drafting.validators import (
    evaluate_draft_issues,
    find_unauthorized_draft_numbers,
)
from app.schemas.ai_results import DraftContent
from app.schemas.drafting_dto import DraftIssueItem, DraftIssueSeverity

_INJECTION_QUERY_MARKERS = (
    "trích thông tư",
    "trích nghị định",
    "ghi số thuế",
    "bỏ qua quy tắc",
    "ignore previous",
)


def build_draft_retrieval_query(snapshot_data: dict, template_schema: Any) -> str:
    """Build a Vietnamese semantic query from template labels and clean descriptive snapshot fields."""
    parts: list[str] = [
        "Quy định pháp luật thuế thu nhập doanh nghiệp TNDN thuế suất phương pháp tính thuế thu nhập tính thuế doanh thu chi phí được trừ quyết toán thuế"
    ]
    tax_focus_keys = TAX_AMOUNT_KEYS | TAX_RATE_KEYS | TAXABLE_INCOME_KEYS | ASSESSABLE_INCOME_KEYS
    needs_tax_rate_focus = False

    for field in extract_template_fields(template_schema):
        if canonical_key(field.get("id") or field.get("name") or field.get("key")) in tax_focus_keys:
            needs_tax_rate_focus = True
        for key in ("label", "title", "group"):
            val = field.get(key)
            if isinstance(val, str) and val.strip():
                parts.append(val.strip())

    if isinstance(snapshot_data, dict):
        for key, val in snapshot_data.items():
            if canonical_key(key) in tax_focus_keys:
                needs_tax_rate_focus = True
            if isinstance(val, str):
                cleaned = val.strip()
                if cleaned and not cleaned.isdigit() and not any(
                    m in cleaned.lower() for m in _INJECTION_QUERY_MARKERS
                ):
                    parts.append(cleaned)

    if needs_tax_rate_focus:
        parts.append("Điều 10 thuế suất thuế thu nhập doanh nghiệp 20% 17% 15% cách tính thuế TNDN phải nộp")
    return " | ".join(dict.fromkeys(parts))


def prioritize_draft_hits(
    retrieved_hits: list,
    snapshot_data: dict,
    template_schema: Any,
) -> list:
    """Place tax-rate and tax-calculation articles ahead of generic expense articles when drafting tax payable."""
    if not retrieved_hits or not draft_involves_tax_rate(snapshot_data, template_schema):
        return retrieved_hits

    def _priority_key(item: tuple[int, Any]) -> tuple[int, int]:
        idx, hit = item
        payload = getattr(hit, "payload", None) or {}
        text = " ".join(str(payload.get(k) or "") for k in ("article", "clause", "text_content")).lower()
        has_rate = "thuế suất" in text and any(r in text for r in ("20%", "17%", "15%"))
        return (0 if has_rate else 1, idx)

    return [hit for _, hit in sorted(enumerate(retrieved_hits), key=_priority_key)]


def _synthesize_snapshot_narrative(snapshot_data: dict, template_schema: Any) -> str:
    """Build a deterministic Vietnamese explanation strictly from user-provided snapshot values."""
    label_map = {
        str(f.get("id") or f.get("name") or f.get("key") or "").strip(): str(f.get("label") or f.get("title") or "").strip()
        for f in extract_template_fields(template_schema)
        if (f.get("id") or f.get("name") or f.get("key")) and (f.get("label") or f.get("title"))
    }
    lines = ["Bản nháp thuyết minh được tổng hợp từ dữ liệu đầu vào đã xác nhận của người nộp thuế:"]
    for key, val in snapshot_data.items():
        if not is_non_empty_value(val):
            continue
        display_label = label_map.get(str(key), str(key))
        val_text = val.strip() if isinstance(val, str) else json.dumps(val, ensure_ascii=False)
        lines.append(f"- {display_label}: {val_text}.")
    return "\n".join(lines)


def _reconcile_tax_amount_fields(
    enriched: dict[str, Any],
    snapshot: dict[str, Any],
    template_schema: Any,
    derived_tax_info: dict[str, Any] | None,
) -> list[DraftIssueItem]:
    """Backfill verified tax_amount, or clear misassigned revenue/income values and emit an issue."""
    issues: list[DraftIssueItem] = []
    explicit_tax = lookup_numeric_by_keys(snapshot, TAX_AMOUNT_KEYS)
    derived_tax = (derived_tax_info or {}).get("calculated_tax_amount")
    income_or_rev = {
        v
        for v in (
            lookup_numeric_by_keys(snapshot, REVENUE_KEYS),
            lookup_numeric_by_keys(snapshot, TAXABLE_INCOME_KEYS),
            lookup_numeric_by_keys(snapshot, ASSESSABLE_INCOME_KEYS),
        )
        if v is not None and v > 0
    }

    targets: list[tuple[str, str, bool, Any]] = []
    seen_keys: set[str] = set()
    for field in extract_template_fields(template_schema):
        fkey = str(field.get("id") or field.get("name") or field.get("key") or "").strip()
        if fkey and canonical_key(fkey) in TAX_AMOUNT_KEYS:
            seen_keys.add(fkey)
            targets.append((fkey, str(field.get("label") or fkey), bool(field.get("required")), lookup_field_value(enriched, field)))
    for key in list(enriched.keys()):
        if canonical_key(key) in TAX_AMOUNT_KEYS and key not in seen_keys:
            targets.append((key, key, False, enriched.get(key)))

    for fkey, label, is_required, current_val in targets:
        current_num = parse_numeric_scalar(current_val)
        if explicit_tax is not None:
            if current_num != explicit_tax:
                enriched[fkey] = int(explicit_tax) if float(explicit_tax).is_integer() else explicit_tax
        elif derived_tax is not None:
            if not is_non_empty_value(current_val) or (
                current_num is not None and current_num != float(derived_tax) and current_num in income_or_rev
            ):
                enriched[fkey] = derived_tax
        else:
            is_misassigned = current_num is not None and current_num in income_or_rev
            if is_misassigned or (is_required and not is_non_empty_value(current_val)):
                enriched[fkey] = None
                issues.append(
                    DraftIssueItem(
                        code="MISSING_TAX_AMOUNT_INPUT",
                        type="GROUNDING_ISSUE",
                        severity=DraftIssueSeverity.BLOCKING if (is_required or is_misassigned) else DraftIssueSeverity.WARNING,
                        description=(
                            f"Trường số thuế '{label}' chưa có sẵn trong Input Snapshot và chưa đủ chỉ tiêu/thuế suất "
                            "được phê duyệt để xác định chính xác; đã để trống để tránh điền sai nghĩa."
                        ),
                        field_id=fkey,
                    )
                )
    return issues


def _enrich_draft_content(
    draft_content: dict[str, Any],
    snapshot_data: dict,
    template_schema: Any,
    has_legal_basis: bool,
    derived_tax_info: dict[str, Any] | None = None,
) -> tuple[dict[str, Any], list[DraftIssueItem]]:
    """Backfill missing required fields, enforce verified tax amounts, and synthesize narrative when ungrounded."""
    enriched = dict(draft_content)
    snapshot = snapshot_data if isinstance(snapshot_data, dict) else {}
    tax_issues = _reconcile_tax_amount_fields(enriched, snapshot, template_schema, derived_tax_info)

    for field in extract_template_fields(template_schema):
        if not field.get("required") or is_legal_basis_field(field):
            continue
        if is_non_empty_value(lookup_field_value(enriched, field)):
            continue
        snapshot_val = lookup_field_value(snapshot, field)
        field_key = str(field.get("id") or field.get("name") or field.get("key") or "").strip()
        if field_key and is_non_empty_value(snapshot_val):
            enriched[field_key] = snapshot_val

    if not has_legal_basis and snapshot:
        snapshot_keys = {str(k).strip().lower() for k in snapshot.keys()}
        content_keys = {str(k).strip().lower() for k in enriched.keys()}
        if content_keys and content_keys.issubset(snapshot_keys):
            enriched["noi_dung_giai_trinh"] = _synthesize_snapshot_narrative(snapshot, template_schema)
            enriched["can_cu_phap_ly"] = NO_APPROVED_LEGAL_BASIS_NOTE

    return enriched, tax_issues


class DocumentDrafter:
    @staticmethod
    def generate_draft(
        snapshot_data: dict,
        template_schema: Any,
        legal_context: str,
        citations: list[dict[str, Any]] | None = None,
        retrieved_hits: list | None = None,
    ) -> dict:
        resolved_citations = citations or []
        has_legal_basis = bool(legal_context and legal_context.strip()) and len(resolved_citations) > 0
        derived_tax_info = (
            derive_cit_calculation(snapshot_data, legal_context, retrieved_hits)
            if has_legal_basis
            else {}
        )

        prompt = build_draft_prompt(
            snapshot_data=snapshot_data,
            template_schema=template_schema,
            legal_context=legal_context,
            derived_tax_info=derived_tax_info or None,
        )
        res = llm_model.invoke(prompt)
        raw_draft_content = parse_ai_response(res.content, DraftContent).root

        draft_content, tax_issues = _enrich_draft_content(
            draft_content=raw_draft_content,
            snapshot_data=snapshot_data,
            template_schema=template_schema,
            has_legal_basis=has_legal_basis,
            derived_tax_info=derived_tax_info or None,
        )

        unauthorized = find_unauthorized_draft_numbers(
            draft_content=draft_content,
            snapshot_data=snapshot_data,
            derived_tax_info=derived_tax_info or None,
            citations=resolved_citations,
            legal_context=legal_context,
            retrieved_hits=retrieved_hits,
        )
        issues = tax_issues + evaluate_draft_issues(
            template_schema=template_schema,
            legal_context=legal_context,
            draft_content=draft_content,
            unauthorized_numbers=unauthorized,
            citations=resolved_citations,
            retrieved_hits=retrieved_hits,
        )
        content_hash = hashlib.sha256(
            json.dumps(draft_content, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
        ).hexdigest()

        return {
            "content": draft_content,
            "content_hash": content_hash,
            "has_unauthorized_numbers": len(unauthorized) > 0,
            "unauthorized_numbers": unauthorized,
            "has_grounding_issues": any(i.type == "GROUNDING_ISSUE" for i in issues),
            "issues": issues,
        }
