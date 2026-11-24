import hashlib
import json
import re
from typing import Any

from app.core.ai_response import parse_ai_response
from app.core.models import llm_model
from app.modules.drafting.prompts import build_draft_prompt
from app.schemas.ai_results import DraftContent
from app.schemas.drafting_dto import DraftIssueItem, DraftIssueSeverity

_NUMBER_RE = re.compile(r"\b\d+(?:[.,]\d+)?\b")
_LEGAL_REF_RE = re.compile(
    r"(?:"
    r"\b(?:nghị\s+định|thông\s+tư|quyết\s+định|luật|nghị\s+quyết)\s+(?:số\s+)?\d+(?:/\d{4})?(?:/[\w\-]+)?\b"
    r"|\bđiều\s+\d+\b"
    r"|\b\d+/\d{4}/(?:nđ-cp|nd-cp|tt-btc|qh\d+|qđ-ttg|qd-ttg)\b"
    r")",
    re.IGNORECASE,
)
_LEGAL_FIELD_KEYWORDS = (
    "legal_basis",
    "legalbasis",
    "legal_reference",
    "legalreference",
    "can_cu_phap_ly",
    "cancuphaply",
    "co_so_phap_ly",
    "cosophaply",
    "căn cứ pháp lý",
    "cơ sở pháp lý",
    "căn cứ luật",
)
_NO_BASIS_MARKERS = (
    "chưa có căn cứ pháp lý",
    "không có căn cứ pháp lý",
    "thiếu căn cứ pháp lý",
    "không tìm thấy căn cứ pháp lý",
)


def _extract_numbers(value: Any) -> set[str]:
    return set(_NUMBER_RE.findall(json.dumps(value, ensure_ascii=False)))


def _extract_citation_numbers(citations: list[dict[str, Any]]) -> set[str]:
    tokens: list[str] = []
    for citation in citations:
        for key in (
            "document_number",
            "doc_title",
            "article",
            "clause",
            "point",
            "effective_from",
            "effective_to",
        ):
            val = citation.get(key)
            if isinstance(val, str) and val.strip():
                tokens.append(val)
    return _extract_numbers(tokens) if tokens else set()


def _extract_template_fields(template_schema: Any) -> list[dict[str, Any]]:
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


def _is_legal_basis_field(field: dict[str, Any]) -> bool:
    candidates = [
        str(field.get(k) or "").strip().lower()
        for k in ("id", "name", "key", "label", "group")
    ]
    return any(
        kw in text
        for text in candidates
        if text
        for kw in _LEGAL_FIELD_KEYWORDS
    )


def _lookup_field_value(draft_content: dict[str, Any], field: dict[str, Any]) -> Any:
    keys = [
        str(field.get(k)).strip()
        for k in ("id", "name", "key", "label")
        if field.get(k)
    ]
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


def _is_non_empty_value(value: Any) -> bool:
    if value is None:
        return False
    if isinstance(value, str):
        return bool(value.strip())
    if isinstance(value, (list, dict)):
        return len(value) > 0
    return True


def _is_traceable_citation(citation: dict[str, Any]) -> bool:
    if citation.get("available") is False or citation.get("synthetic") is True:
        return False
    doc_no = str(citation.get("document_number") or "").strip()
    source_id = str(citation.get("legal_source_id") or "").strip()
    return bool(doc_no or source_id)


def _is_complete_citation(citation: dict[str, Any]) -> bool:
    has_ref = any(
        str(citation.get(k) or "").strip() for k in ("article", "clause", "point")
    )
    has_effective = bool(str(citation.get("effective_from") or "").strip())
    return has_ref and has_effective


def _evaluate_draft_issues(
    snapshot_data: dict,
    template_schema: Any,
    legal_context: str,
    draft_content: dict[str, Any],
    unauthorized_numbers: list[str],
    citations: list[dict[str, Any]],
) -> list[DraftIssueItem]:
    issues: list[DraftIssueItem] = []
    has_legal_basis = bool(legal_context and legal_context.strip()) and len(citations) > 0

    # 1. BR-D12 Grounding Issue when no approved legal basis was retrieved.
    if not has_legal_basis:
        issues.append(
            DraftIssueItem(
                code="MISSING_LEGAL_BASIS",
                type="GROUNDING_ISSUE",
                severity=DraftIssueSeverity.BLOCKING,
                description=(
                    "Không tìm thấy căn cứ pháp lý đã được phê duyệt phù hợp với kỳ tính thuế "
                    "trong kho tri thức. AI không được tự tạo căn cứ pháp lý."
                ),
            )
        )

        snapshot_refs = {
            m.group(0).strip().lower()
            for m in _LEGAL_REF_RE.finditer(json.dumps(snapshot_data, ensure_ascii=False))
        }
        output_text = json.dumps(draft_content, ensure_ascii=False)
        fabricated_refs = sorted(
            {
                m.group(0).strip()
                for m in _LEGAL_REF_RE.finditer(output_text)
                if m.group(0).strip().lower() not in snapshot_refs
            }
        )
        if fabricated_refs:
            issues.append(
                DraftIssueItem(
                    code="FABRICATED_LEGAL_BASIS",
                    type="GROUNDING_ISSUE",
                    severity=DraftIssueSeverity.BLOCKING,
                    description=(
                        "Bản nháp có đề cập căn cứ pháp lý không tồn tại trong kho tri thức truy xuất: "
                        + ", ".join(fabricated_refs[:5])
                        + "."
                    ),
                )
            )
    else:
        # 2. Check mandatory legal-basis sections in template schema.
        for field in _extract_template_fields(template_schema):
            if not field.get("required") or not _is_legal_basis_field(field):
                continue
            field_id = str(field.get("id") or field.get("name") or field.get("label") or "legal_basis")
            label = str(field.get("label") or field_id)
            value = _lookup_field_value(draft_content, field)
            text_val = value.strip().lower() if isinstance(value, str) else ""
            if not _is_non_empty_value(value) or any(
                marker in text_val for marker in _NO_BASIS_MARKERS
            ):
                issues.append(
                    DraftIssueItem(
                        code="UNGROUNDED_LEGAL_SECTION",
                        type="GROUNDING_ISSUE",
                        severity=DraftIssueSeverity.BLOCKING,
                        description=(
                            f"Nội dung pháp lý bắt buộc '{label}' chưa có căn cứ pháp lý được đối chiếu."
                        ),
                        field_id=field_id,
                    )
                )

    # 3. Numerical integrity guardrail.
    if unauthorized_numbers:
        issues.append(
            DraftIssueItem(
                code="UNAUTHORIZED_NUMBERS",
                type="NUMERICAL_INTEGRITY",
                severity=DraftIssueSeverity.BLOCKING,
                description=(
                    "Phát hiện số liệu trong bản nháp không truy về được dữ liệu đầu vào (Input Snapshot): "
                    + ", ".join(unauthorized_numbers[:10])
                    + "."
                ),
            )
        )

    # 4. Citation traceability checks when citations exist.
    if citations:
        traceable = [c for c in citations if _is_traceable_citation(c)]
        if not traceable:
            issues.append(
                DraftIssueItem(
                    code="UNTRACEABLE_REQUIRED_CITATION",
                    type="CITATION_TRACEABILITY",
                    severity=DraftIssueSeverity.BLOCKING,
                    description=(
                        "Các trích dẫn pháp lý đi kèm không đủ định danh nguồn để truy vết "
                        "(thiếu số hiệu văn bản và mã nguồn pháp lý)."
                    ),
                )
            )
        else:
            for idx, citation in enumerate(citations):
                cid = str(
                    citation.get("document_number")
                    or citation.get("legal_source_id")
                    or idx
                )
                if not _is_traceable_citation(citation):
                    issues.append(
                        DraftIssueItem(
                            code="INCOMPLETE_CITATION_METADATA",
                            type="CITATION_TRACEABILITY",
                            severity=DraftIssueSeverity.WARNING,
                            description=(
                                f"Trích dẫn #{idx + 1} thiếu mã nguồn hoặc số hiệu văn bản để truy vết đầy đủ."
                            ),
                            citation_id=cid,
                        )
                    )
                elif not _is_complete_citation(citation):
                    issues.append(
                        DraftIssueItem(
                            code="INCOMPLETE_CITATION_METADATA",
                            type="CITATION_TRACEABILITY",
                            severity=DraftIssueSeverity.WARNING,
                            description=(
                                f"Trích dẫn '{cid}' thiếu chi tiết điều/khoản hoặc ngày hiệu lực."
                            ),
                            citation_id=cid,
                        )
                    )

    return issues


class DocumentDrafter:
    @staticmethod
    def generate_draft(
        snapshot_data: dict,
        template_schema: Any,
        legal_context: str,
        citations: list[dict[str, Any]] | None = None,
    ) -> dict:
        prompt = build_draft_prompt(
            snapshot_data=snapshot_data,
            template_schema=template_schema,
            legal_context=legal_context,
        )
        res = llm_model.invoke(prompt)
        draft_content = parse_ai_response(res.content, DraftContent).root

        resolved_citations = citations or []

        # Guardrail: detect numbers absent from the input snapshot and retrieved citation references.
        allowed_numbers = _extract_numbers(snapshot_data) | _extract_citation_numbers(
            resolved_citations
        )
        output_numbers = _extract_numbers(draft_content)
        unauthorized = sorted(output_numbers - allowed_numbers)

        issues = _evaluate_draft_issues(
            snapshot_data=snapshot_data,
            template_schema=template_schema,
            legal_context=legal_context,
            draft_content=draft_content,
            unauthorized_numbers=unauthorized,
            citations=resolved_citations,
        )

        # Hash the canonical content for integrity checks.
        content_hash = hashlib.sha256(
            json.dumps(
                draft_content, sort_keys=True, separators=(",", ":"), ensure_ascii=False
            ).encode("utf-8")
        ).hexdigest()

        return {
            "content": draft_content,
            "content_hash": content_hash,
            "has_unauthorized_numbers": len(unauthorized) > 0,
            "unauthorized_numbers": unauthorized,
            "has_grounding_issues": any(i.type == "GROUNDING_ISSUE" for i in issues),
            "issues": issues,
        }
