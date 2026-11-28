import json
import re
from typing import Any

from app.core.cit_math import (
    NUMBER_TOKEN_RE,
    SCALED_MONEY_SPAN_RE,
    UNIT_SCALE_VND,
    money_representations,
    normalize_number_token,
    parse_numeric_scalar,
)
from app.core.legal_refs import LEGAL_REF_RE, extract_document_numbers
from app.modules.drafting.tax_calculator import (
    extract_template_fields,
    is_legal_basis_field,
    is_non_empty_value,
    lookup_field_value,
)
from app.schemas.drafting_dto import DraftIssueItem, DraftIssueSeverity

_DRAFT_LEGAL_SPAN_STRIP_RE = re.compile(
    r"(?:"
    r"\b(?:nghị\s+định|thông\s+tư|quyết\s+định|luật|nghị\s+quyết)\s+(?:số\s+)?\d+(?:/\d{4})?(?:/[\w\-]+)?\b"
    r"|\b(?:chương|mục|điều|khoản)\s+\d+\b"
    r"|\bđiểm\s+[a-zđ]\d*\b"
    r"|\b\d+/\d{4}/(?:nđ-cp|nd-cp|tt-btc|qh\d+|qđ-ttg|qd-ttg)\b"
    r")",
    re.IGNORECASE,
)
_NAMED_DOC_REF_RE = re.compile(
    r"\b(?:nghị\s+định|thông\s+tư|quyết\s+định|luật|nghị\s+quyết)\s+(?:số\s+)?(\d+(?:/\d{4})?(?:/[\w\-]+)?)\b"
    r"|\b(\d+/\d{4}/(?:nđ-cp|nd-cp|tt-btc|qh\d+|qđ-ttg|qd-ttg))\b",
    re.IGNORECASE,
)
_NO_BASIS_MARKERS = (
    "chưa có căn cứ pháp lý",
    "không có căn cứ pháp lý",
    "thiếu căn cứ pháp lý",
    "không tìm thấy căn cứ pháp lý",
)
_GROUPED_THOUSANDS_RE = re.compile(r"\d{1,3}(?:[.,]\d{3})+")
# Phrases that turn a snapshot value into an instruction to the model instead of user data (SH-05).
_INSTRUCTION_MARKERS = (
    "bỏ qua hướng dẫn",
    "bỏ qua quy tắc",
    "bỏ qua các hướng dẫn",
    "ghi số thuế",
    "ghi mã số thuế",
    "trích thông tư",
    "trích nghị định",
    "trích luật",
    "ignore previous",
    "ignore all previous",
    "disregard previous",
)
_REVENUE_LIMIT_RE = re.compile(
    r"doanh\s+thu[^.;:\n\"]{0,60}?\b(không\s+vượt\s+quá|chưa\s+vượt\s+quá|không\s+quá|dưới|thấp\s+hơn"
    r"|vượt\s+quá|trên|lớn\s+hơn|cao\s+hơn)\s+(\d+(?:[.,]\d+)?)\s*(tỷ|triệu)",
    re.IGNORECASE,
)
_CASH_LIMIT_RE = re.compile(
    r"từ\s+(\d+(?:[.,]\d+)?)\s*(triệu|nghìn|ngàn)\s+đồng\s+trở\s+lên[^.;]{0,160}?không\s+dùng\s+tiền\s+mặt"
    r"|không\s+dùng\s+tiền\s+mặt[^.;]{0,160}?từ\s+(\d+(?:[.,]\d+)?)\s*(triệu|nghìn|ngàn)\s+đồng\s+trở\s+lên",
    re.IGNORECASE,
)
_CASH_PAYMENT_RE = re.compile(r"(?:thanh\s+toán|trả)\s+(?:bằng\s+)?tiền\s+mặt", re.IGNORECASE)
_DEDUCTIBLE_CLAIM_RE = re.compile(r"\bđược\s+(?:trừ|tính\s+vào\s+chi\s+phí)\b", re.IGNORECASE)
_NOT_DEDUCTIBLE_RE = re.compile(
    r"\b(?:không|chưa)\s+(?:đủ\s+điều\s+kiện\s+(?:để\s+)?)?(?:được\s+)?(?:trừ|tính\s+vào\s+chi\s+phí)\b",
    re.IGNORECASE,
)


def is_instruction_text(value: Any) -> bool:
    """True when a snapshot string value reads as a command to the model rather than taxpayer data."""
    return isinstance(value, str) and any(marker in value.lower() for marker in _INSTRUCTION_MARKERS)


def strip_instruction_values(snapshot_data: Any) -> dict[str, Any]:
    """Return the snapshot without top-level string values that carry injected instructions."""
    if not isinstance(snapshot_data, dict):
        return {}
    return {key: val for key, val in snapshot_data.items() if not is_instruction_text(val)}


def _draft_text(draft_content: dict[str, Any]) -> str:
    return " ".join(
        str(val) for val in draft_content.values() if isinstance(val, str)
    )


def _revenue_contradictions(draft_text: str, revenue_vnd: float | None) -> list[str]:
    """Statements such as "doanh thu không vượt quá 1 tỷ" that the snapshot revenue disproves (SH-03)."""
    if revenue_vnd is None:
        return []
    found: list[str] = []
    for sentence in re.split(r"[.;\n]+(?!\d)", draft_text):
        # A quoted rate bracket ("doanh thu từ trên 3 tỷ đến 50 tỷ áp dụng 17%") is law, not a claim about this company.
        lowered = sentence.lower()
        if "%" in lowered or "thuế suất" in lowered or " đến " in lowered:
            continue
        found.extend(_revenue_limit_claims(sentence, revenue_vnd))
    return found


def _revenue_limit_claims(sentence: str, revenue_vnd: float) -> list[str]:
    found: list[str] = []
    for match in _REVENUE_LIMIT_RE.finditer(sentence):
        word = " ".join(match.group(1).lower().split())
        limit = parse_numeric_scalar(match.group(2).replace(",", "."))
        if limit is None:
            continue
        limit_vnd = limit * UNIT_SCALE_VND[match.group(3).lower()]
        claims_below = word in {"không vượt quá", "chưa vượt quá", "không quá", "dưới", "thấp hơn"}
        if (claims_below and revenue_vnd > limit_vnd) or (not claims_below and revenue_vnd <= limit_vnd):
            found.append(match.group(0).strip())
    return found


def _cash_limit_vnd(law_text: str) -> float | None:
    match = _CASH_LIMIT_RE.search(law_text)
    if not match:
        return None
    raw, unit = (match.group(1), match.group(2)) if match.group(1) else (match.group(3), match.group(4))
    value = parse_numeric_scalar(raw.replace(",", "."))
    return value * UNIT_SCALE_VND[unit.lower()] if value is not None else None


def _cash_payment_contradiction(
    draft_text: str, snapshot_data: dict[str, Any], expense_vnd: float | None, law_text: str
) -> bool:
    """True when a cash-paid expense at or above the statutory limit is still called deductible (SH-02)."""
    snapshot_text = " ".join(str(v) for v in snapshot_data.values() if isinstance(v, str))
    if expense_vnd is None or not _CASH_PAYMENT_RE.search(snapshot_text):
        return False
    limit = _cash_limit_vnd(law_text)
    if limit is None or expense_vnd < limit:
        return False
    # Quoting the rule ("được trừ các khoản chi ... không dùng tiền mặt") is fine once the draft also says this
    # expense is not deductible; only a draft that never says so is flagged.
    return bool(_DEDUCTIBLE_CLAIM_RE.search(draft_text)) and not _NOT_DEDUCTIBLE_RE.search(draft_text)


def find_input_contradictions(
    draft_content: dict[str, Any],
    snapshot_data: dict[str, Any],
    revenue_vnd: float | None,
    expense_vnd: float | None,
    law_text: str,
) -> list[DraftIssueItem]:
    """Flag draft statements that contradict the snapshot or the retrieved law on deterministic facts."""
    issues: list[DraftIssueItem] = []
    text = _draft_text(draft_content)
    revenue_claims = _revenue_contradictions(text, revenue_vnd)
    if revenue_claims:
        issues.append(
            DraftIssueItem(
                code="CONTRADICTS_INPUT_SNAPSHOT",
                type="GROUNDING_ISSUE",
                severity=DraftIssueSeverity.BLOCKING,
                description=(
                    "Bản nháp nêu mức doanh thu trái với dữ liệu đầu vào: " + "; ".join(revenue_claims[:3]) + "."
                ),
            )
        )
    if _cash_payment_contradiction(text, snapshot_data, expense_vnd, law_text):
        issues.append(
            DraftIssueItem(
                code="CASH_PAYMENT_NOT_DEDUCTIBLE",
                type="GROUNDING_ISSUE",
                severity=DraftIssueSeverity.BLOCKING,
                description=(
                    "Khoản chi thanh toán bằng tiền mặt từ mức phải thanh toán không dùng tiền mặt trở lên "
                    "nhưng bản nháp kết luận được trừ, trái với căn cứ pháp lý truy xuất."
                ),
            )
        )
    return issues


def find_missing_tax_rate(draft_content: dict[str, Any], derived_tax_info: dict[str, Any] | None) -> DraftIssueItem | None:
    """Require the draft to state the rate the code derived from revenue and the retrieved rate clause (SH-03)."""
    rate = (derived_tax_info or {}).get("applicable_tax_rate_percent")
    if rate is None:
        return None
    rate_text = f"{rate:g}" if isinstance(rate, float) else str(rate)
    if re.search(rf"(?<![\d.,]){re.escape(rate_text)}\s*%", _draft_text(draft_content)):
        return None
    return DraftIssueItem(
        code="MISSING_TAX_RATE_BASIS",
        type="GROUNDING_ISSUE",
        severity=DraftIssueSeverity.BLOCKING,
        description=(
            f"Bản nháp chưa nêu thuế suất {rate_text}% và điều khoản thuế suất tương ứng với doanh thu "
            "trong dữ liệu đầu vào."
        ),
    )


def instruction_in_snapshot_issue(snapshot_data: Any) -> DraftIssueItem | None:
    """Flag a snapshot that carries injected instructions so a reviewer checks the draft (SH-05)."""
    if not isinstance(snapshot_data, dict):
        return None
    keys = [str(k) for k, v in snapshot_data.items() if is_instruction_text(v)]
    if not keys:
        return None
    return DraftIssueItem(
        code="INSTRUCTION_IN_SNAPSHOT",
        type="GROUNDING_ISSUE",
        severity=DraftIssueSeverity.BLOCKING,
        description=(
            "Dữ liệu đầu vào có câu lệnh điều khiển (ví dụ yêu cầu ghi số thuế hoặc trích văn bản) ở trường: "
            + ", ".join(keys[:5]) + ". Hệ thống đã bỏ qua các trường này khi soạn; cần kiểm tra lại dữ liệu."
        ),
        field_id=keys[0],
    )


def _extract_numbers(value: Any) -> set[str]:
    return set(NUMBER_TOKEN_RE.findall(json.dumps(value, ensure_ascii=False)))


def _is_traceable_citation(citation: dict[str, Any]) -> bool:
    if citation.get("available") is False or citation.get("synthetic") is True:
        return False
    doc_no = str(citation.get("document_number") or "").strip()
    source_id = str(citation.get("legal_source_id") or "").strip()
    return bool(doc_no or source_id)


def _is_complete_citation(citation: dict[str, Any]) -> bool:
    has_ref = any(str(citation.get(k) or "").strip() for k in ("article", "clause", "point"))
    has_effective = bool(str(citation.get("effective_from") or "").strip())
    return has_ref and has_effective


def _extract_snapshot_allowed_numbers(value: Any) -> tuple[set[str], set[int]]:
    """Extract raw tokens plus unit-scaled VND equivalents from snapshot or verified tax info."""
    tokens = _extract_numbers(value)
    vnd_amounts: set[int] = set()

    def _collect(node: Any) -> None:
        if isinstance(node, dict):
            for child in node.values():
                _collect(child)
        elif isinstance(node, list):
            for child in node:
                _collect(child)
        else:
            parsed = parse_numeric_scalar(node)
            if parsed is not None and parsed >= 1_000_000:
                vnd_amounts.add(int(round(parsed)))
                tokens.update(money_representations(parsed, include_comma_decimal=True))
            elif isinstance(node, str):
                for raw_num, unit in SCALED_MONEY_SPAN_RE.findall(node):
                    p_dec = (
                        float(raw_num.replace(",", "."))
                        if re.fullmatch(r"\d+[.,]\d+", raw_num)
                        else parse_numeric_scalar(raw_num)
                    )
                    if p_dec is not None:
                        vnd = p_dec * UNIT_SCALE_VND[unit.lower()]
                        vnd_amounts.add(int(round(vnd)))
                        tokens.update(money_representations(vnd, include_comma_decimal=True))

    _collect(value)
    return tokens, vnd_amounts


def _extract_draft_output_numbers(draft_content: Any, allowed_vnd_amounts: set[int]) -> tuple[set[str], set[str]]:
    """Extract numbers from draft content while stripping legal-ref spans (E2) and matching scaled money (E3).

    Also returns misscaled figures: "2,800 tỷ" for an allowed 2.8 billion reads as 2,800 billion (SH-03).
    """
    serialized = json.dumps(draft_content, ensure_ascii=False)
    without_legal_refs = _DRAFT_LEGAL_SPAN_STRIP_RE.sub(" ", serialized)
    misscaled: set[str] = set()

    def _strip_authorized_money_span(match: re.Match) -> str:
        raw_num, unit = match.group(1), match.group(2)
        scale = UNIT_SCALE_VND[unit.lower()]
        grouped = parse_numeric_scalar(raw_num)
        if _GROUPED_THOUSANDS_RE.fullmatch(raw_num):
            if grouped is not None and int(round(grouped * scale)) in allowed_vnd_amounts:
                return " "
            # One separator only ("2,800"): its decimal reading 2.8 is the amount the model meant to write.
            if re.fullmatch(r"\d+[.,]\d+", raw_num):
                as_decimal = float(raw_num.replace(",", ".")) * scale
                if int(round(as_decimal)) in allowed_vnd_amounts:
                    misscaled.add(raw_num)
            return match.group(0)
        candidates: list[float] = []
        if re.fullmatch(r"\d+[.,]\d+", raw_num):
            candidates.append(float(raw_num.replace(",", ".")) * scale)
        if grouped is not None:
            candidates.append(grouped * scale)
        return " " if any(int(round(c)) in allowed_vnd_amounts for c in candidates) else match.group(0)

    cleaned = SCALED_MONEY_SPAN_RE.sub(_strip_authorized_money_span, without_legal_refs)
    return set(NUMBER_TOKEN_RE.findall(cleaned)), misscaled


def _extract_citation_numbers(
    citations: list[dict[str, Any]],
    legal_context: str = "",
    retrieved_hits: list | None = None,
) -> set[str]:
    """Extract numbers from traceable citations and retrieved law text (so '05' in law is allowed — E2)."""
    tokens: list[str] = []
    for citation in citations:
        for key in ("document_number", "doc_title", "article", "clause", "point", "effective_from", "effective_to", "text"):
            val = citation.get(key)
            if isinstance(val, str) and val.strip():
                tokens.append(val)
    if any(_is_traceable_citation(c) for c in citations):
        if legal_context and legal_context.strip():
            tokens.append(legal_context)
        for hit in retrieved_hits or []:
            body = str((getattr(hit, "payload", None) or {}).get("text_content") or "").strip()
            if body:
                tokens.append(body)
    return _extract_numbers(tokens) if tokens else set()


def find_unauthorized_draft_numbers(
    draft_content: dict[str, Any],
    snapshot_data: dict,
    derived_tax_info: dict[str, Any] | None,
    citations: list[dict[str, Any]],
    legal_context: str,
    retrieved_hits: list | None = None,
) -> list[str]:
    """Return sorted list of numbers in draft_content not backed by snapshot, verified tax math, or citations."""
    # Numbers inside injected instructions ("ghi số thuế 999999999") are not taxpayer data (SH-05).
    snap_tokens, snap_vnd = _extract_snapshot_allowed_numbers(strip_instruction_values(snapshot_data))
    derived_tokens, derived_vnd = (
        _extract_snapshot_allowed_numbers(derived_tax_info) if derived_tax_info else (set(), set())
    )
    allowed = snap_tokens | derived_tokens | _extract_citation_numbers(citations, legal_context, retrieved_hits)
    normalized_allowed = {normalize_number_token(tok) for tok in allowed} | allowed
    output_tokens, misscaled = _extract_draft_output_numbers(draft_content, snap_vnd | derived_vnd)
    return sorted(
        {
            tok
            for tok in output_tokens
            if tok not in normalized_allowed and normalize_number_token(tok) not in normalized_allowed
        }
        | misscaled
    )


def _find_fabricated_legal_refs(
    draft_content: dict[str, Any],
    has_legal_basis: bool,
    citations: list[dict[str, Any]],
    legal_context: str,
    retrieved_hits: list | None = None,
) -> list[str]:
    """Detect any legal reference in the generated draft that does not come from retrieved KB sources."""
    output_text = json.dumps(draft_content, ensure_ascii=False)
    if not has_legal_basis:
        return sorted({m.group(0).strip() for m in LEGAL_REF_RE.finditer(output_text)})

    allowed_docs = extract_document_numbers(legal_context)
    for citation in citations:
        for key in ("document_number", "doc_title"):
            allowed_docs |= extract_document_numbers(str(citation.get(key) or ""))
    for hit in retrieved_hits or []:
        payload = getattr(hit, "payload", None) or {}
        for key in ("document_number", "document_title", "doc_title", "text_content"):
            allowed_docs |= extract_document_numbers(str(payload.get(key) or ""))

    fabricated: set[str] = set()
    allowed_prefixes = {doc.split("/")[0] for doc in allowed_docs}
    for match in _NAMED_DOC_REF_RE.finditer(output_text):
        full_ref = match.group(0).strip()
        mentioned_docs = extract_document_numbers(full_ref)
        if mentioned_docs:
            if not mentioned_docs.issubset(allowed_docs):
                fabricated.add(full_ref)
        else:
            digits = re.findall(r"\d+", full_ref)
            if digits and digits[0].lstrip("0") not in allowed_prefixes:
                fabricated.add(full_ref)
    return sorted(fabricated)


def evaluate_draft_issues(
    template_schema: Any,
    legal_context: str,
    draft_content: dict[str, Any],
    unauthorized_numbers: list[str],
    citations: list[dict[str, Any]],
    retrieved_hits: list | None = None,
) -> list[DraftIssueItem]:
    """Evaluate grounding, fabricated references, numerical integrity, and citation traceability."""
    issues: list[DraftIssueItem] = []
    has_legal_basis = bool(legal_context and legal_context.strip()) and len(citations) > 0

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
    else:
        for field in extract_template_fields(template_schema):
            if not field.get("required") or not is_legal_basis_field(field):
                continue
            field_id = str(field.get("id") or field.get("name") or field.get("label") or "legal_basis")
            label = str(field.get("label") or field_id)
            value = lookup_field_value(draft_content, field)
            text_val = value.strip().lower() if isinstance(value, str) else ""
            if not is_non_empty_value(value) or any(marker in text_val for marker in _NO_BASIS_MARKERS):
                issues.append(
                    DraftIssueItem(
                        code="UNGROUNDED_LEGAL_SECTION",
                        type="GROUNDING_ISSUE",
                        severity=DraftIssueSeverity.BLOCKING,
                        description=f"Nội dung pháp lý bắt buộc '{label}' chưa có căn cứ pháp lý được đối chiếu.",
                        field_id=field_id,
                    )
                )

    fabricated_refs = _find_fabricated_legal_refs(
        draft_content, has_legal_basis, citations, legal_context, retrieved_hits
    )
    if fabricated_refs:
        issues.append(
            DraftIssueItem(
                code="FABRICATED_LEGAL_BASIS",
                type="GROUNDING_ISSUE",
                severity=DraftIssueSeverity.BLOCKING,
                description=(
                    "Bản nháp có đề cập căn cứ pháp lý không tồn tại trong kho tri thức truy xuất: "
                    + ", ".join(fabricated_refs[:5]) + "."
                ),
            )
        )

    if unauthorized_numbers:
        issues.append(
            DraftIssueItem(
                code="UNAUTHORIZED_NUMBERS",
                type="NUMERICAL_INTEGRITY",
                severity=DraftIssueSeverity.BLOCKING,
                description=(
                    "Phát hiện số liệu trong bản nháp không truy về được dữ liệu đầu vào (Input Snapshot): "
                    + ", ".join(unauthorized_numbers[:10]) + "."
                ),
            )
        )

    if citations:
        if not any(_is_traceable_citation(c) for c in citations):
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
                cid = str(citation.get("document_number") or citation.get("legal_source_id") or idx)
                if not _is_traceable_citation(citation):
                    issues.append(
                        DraftIssueItem(
                            code="INCOMPLETE_CITATION_METADATA",
                            type="CITATION_TRACEABILITY",
                            severity=DraftIssueSeverity.WARNING,
                            description=f"Trích dẫn #{idx + 1} thiếu mã nguồn hoặc số hiệu văn bản để truy vết đầy đủ.",
                            citation_id=cid,
                        )
                    )
                elif not _is_complete_citation(citation):
                    issues.append(
                        DraftIssueItem(
                            code="INCOMPLETE_CITATION_METADATA",
                            type="CITATION_TRACEABILITY",
                            severity=DraftIssueSeverity.WARNING,
                            description=f"Trích dẫn '{cid}' thiếu chi tiết điều/khoản hoặc ngày hiệu lực.",
                            citation_id=cid,
                        )
                    )
    return issues
