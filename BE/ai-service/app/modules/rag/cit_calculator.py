from dataclasses import dataclass, field
import re

from app.core.cit_math import (
    UNIT_SCALE_VND,
    format_vnd_human,
    money_representations,
    normalize_number_token,
    parse_numeric_scalar,
    resolve_statutory_cit_rate,
)

CALCULATION_QUESTION_RE = re.compile(
    r"\b\d+(?:[.,]\d+)?\s*(?:tỷ|triệu|nghìn|ngàn|đồng|vnd|ty|trieu|nghin|ngan)\b", re.IGNORECASE
)
CALC_INTENT_KEYWORDS = (
    "tính thuế", "thuế phải nộp", "thuế tndn phải nộp", "số thuế phải nộp",
    "số thuế tndn", "nộp bao nhiêu", "phải nộp là bao nhiêu", "thuế tndn là bao nhiêu",
)
_SECTOR_KEYWORDS = (
    "dịch vụ", "hàng hóa", "phân phối", "cung cấp hàng", "sản xuất", "vận tải",
    "xây dựng", "giáo dục", "y tế", "nghệ thuật", "chứng khoán", "tài chính", "bất động sản",
)
_SPECIFIC_CASE_SUBJECT_RE = re.compile(
    r"\b(?:công\s+ty\s+(?:tôi|em|mình|[a-z]{1,8})\b|doanh\s+nghiệp\s+(?:tôi|em|mình|[a-z]{1,8})\b)",
    re.IGNORECASE,
)
_AMBIGUOUS_CALC_MARKERS = (
    "chi phí không được trừ", "chênh lệch tỷ giá",
    "ebitda", "thu nhập từ nước ngoài", "đã nộp ở nước ngoài",
)


@dataclass
class CitCalcHint:
    prompt_block: str
    authorized_numbers: set[str] = field(default_factory=set)
    expected_tax_numbers: set[str] = field(default_factory=set)
    expected_tax_label: str | None = None
    # What the expected figure is, named in the retry note when the conclusion omits it.
    expected_result_name: str = "số thuế TNDN phải nộp"
    formula_only: bool = False


_PERIOD_YEAR_RE = re.compile(r"\b((?:năm|kỳ)(?:\s+tính\s+thuế)?)\s+(?:19|20)\d{2}\b", re.IGNORECASE)


def _extract_labeled_vnd(text: str, label_regex: str) -> float | None:
    # Drop period years ("năm 2026") so they do not block the label-to-amount match.
    text = _PERIOD_YEAR_RE.sub(r"\1", text)
    pattern = re.compile(
        rf"(?:{label_regex})[^0-9;\n]{{0,35}}?(\d{{1,3}}(?:[.,]\d{{3}})+|\d+(?:[.,]\d+)?)\s*(tỷ|triệu|nghìn|ngàn|đồng|vnd|ty|trieu|nghin|ngan|dong)\b",
        re.IGNORECASE,
    )
    match = pattern.search(text)
    if not match:
        return None
    val = parse_numeric_scalar(match.group(1))
    return val * UNIT_SCALE_VND.get(match.group(2).lower(), 1.0) if val is not None else None


def detect_missing_case_clarification(question: str, retrieved_chunks: list) -> str | None:
    """Return a clarification prompt when a case-specific CIT question omits mandatory revenue or sector (Task #11)."""
    q_norm = " ".join((question or "").lower().split())
    law_text = " ".join(
        str((hit.payload or {}).get("text_content") or "") for hit in retrieved_chunks
    ).lower()

    has_revenue = _extract_labeled_vnd(q_norm, r"\b(?:tổng\s+)?doanh\s+thu") is not None or (
        "doanh thu" in q_norm and bool(CALCULATION_QUESTION_RE.search(q_norm))
    )
    has_explicit_rate = bool(re.search(r"\bthuế\s+suất\s+\d+(?:[.,]\d+)?\s*%", q_norm))
    asks_concrete_tax = any(kw in q_norm for kw in CALC_INTENT_KEYWORDS)
    has_income_figure = _extract_labeled_vnd(q_norm, r"\bthu\s+nhập\s+(?:tính|chịu)\s+thuế") is not None

    if (
        "không xác định được chi phí" in q_norm
        and has_revenue
        and asks_concrete_tax
        and not any(sec in q_norm for sec in _SECTOR_KEYWORDS)
    ):
        return (
            "Theo quy định, tỷ lệ % thuế TNDN tính trên doanh thu phụ thuộc vào lĩnh vực hoạt động "
            "(phân phối/cung cấp hàng hóa, dịch vụ, sản xuất, vận tải, giáo dục, y tế...). "
            "Vui lòng cho biết doanh nghiệp hoạt động trong ngành nghề/lĩnh vực nào?"
        )

    has_multiple_brackets = ("15%" in law_text or "17%" in law_text) and "20%" in law_text
    if has_income_figure and asks_concrete_tax and not has_revenue and not has_explicit_rate and has_multiple_brackets:
        return (
            "Để xác định mức thuế suất TNDN áp dụng (15%, 17% hay 20%) và tính chính xác số thuế phải nộp, "
            "vui lòng cho biết tổng doanh thu năm của doanh nghiệp là bao nhiêu?"
        )

    asks_general_rule = any(
        p in q_norm for p in ("phổ thông", "điều kiện", "quy định thế nào", "những mức nào")
    )
    if (
        _SPECIFIC_CASE_SUBJECT_RE.search(q_norm)
        and not has_revenue
        and not has_explicit_rate
        and not asks_general_rule
        and (
            ("thuế suất" in q_norm and has_multiple_brackets)
            or ("giảm 30%" in q_norm and ("tỷ" in law_text or "doanh thu" in law_text))
        )
    ):
        return (
            "Mức thuế suất / ưu đãi giảm thuế TNDN áp dụng phụ thuộc vào quy mô tổng doanh thu của doanh nghiệp. "
            "Vui lòng cho biết tổng doanh thu của công ty bạn là bao nhiêu?"
        )
    return _missing_own_case_facts(q_norm)


_OWN_CASE_RE = re.compile(
    r"\b(?:công\s+ty|doanh\s+nghiệp)\s+(?:tôi|em|mình)\b|\b(?:giúp|cho)\s+(?:tôi|em|mình)\b"
    r"|\b(?:khoản\s+chi|chi\s+phí)\s+(?:này|đó|trên)\b",
    re.IGNORECASE,
)
_YEAR_RE = re.compile(r"\b(?:19|20)\d{2}\b")


def _missing_own_case_facts(q_norm: str) -> str | None:
    """Ask for the facts when a question about the user's own case gives no figure or description (task 21).

    CP-18 "Khoản chi này của công ty tôi có được trừ không?", LO-07 "Công ty tôi lỗ năm trước thì năm nay được trừ
    bao nhiêu?", MG-12 "Công ty tôi có được giảm thuế TNDN năm 2026 không?", TT-08 "Tính giúp tôi số thuế TNDN phải
    nộp năm 2026."
    """
    if not _OWN_CASE_RE.search(q_norm) or re.search(r"\d", _YEAR_RE.sub(" ", q_norm)):
        return None
    if re.search(r"\b(?:khoản\s+chi|chi\s+phí)\s+(?:này|đó|trên)\b", q_norm) and "trừ" in q_norm:
        return (
            "Để xác định khoản chi có được trừ hay không, vui lòng cho biết nội dung khoản chi, số tiền, "
            "chứng từ (hóa đơn) và cách thanh toán (tiền mặt hay chuyển khoản)."
        )
    if re.search(r"\blỗ\b", q_norm):
        return (
            "Để xác định số lỗ được chuyển, vui lòng cho biết số lỗ, năm phát sinh lỗ và thu nhập tính thuế của năm nay."
        )
    # Short questions only: a longer one usually names the project or sector the incentive depends on.
    if len(q_norm) <= 90 and re.search(r"\b(?:được\s+giảm|giảm\s+thuế|ưu\s+đãi|miễn\s+thuế)\b", q_norm):
        return (
            "Việc giảm hoặc ưu đãi thuế TNDN phụ thuộc vào doanh thu, ngành nghề và loại ưu đãi. "
            "Vui lòng cho biết tổng doanh thu năm, ngành nghề kinh doanh và loại ưu đãi bạn muốn hỏi."
        )
    if any(kw in q_norm for kw in CALC_INTENT_KEYWORDS) or "tính giúp" in q_norm:
        return (
            "Để tính số thuế TNDN phải nộp, vui lòng cho biết tổng doanh thu năm và thu nhập tính thuế "
            "(hoặc doanh thu và chi phí được trừ, số lỗ được chuyển nếu có)."
        )
    return None


def compute_chat_cit_hint(question: str, retrieved_chunks: list) -> CitCalcHint | None:
    """Deterministically compute CIT payable in Python for calculation queries (Task #10)."""
    q_norm = " ".join((question or "").lower().split())
    if not CALCULATION_QUESTION_RE.search(q_norm) or not any(kw in q_norm for kw in CALC_INTENT_KEYWORDS):
        return None
    if "không xác định được chi phí" in q_norm:
        return None
    if any(m in q_norm for m in _AMBIGUOUS_CALC_MARKERS):
        return CitCalcHint(
            prompt_block=(
                "HƯỚNG DẪN TÍNH THUẾ: Bài toán có nhiều khoản điều chỉnh chi tiết; "
                "chỉ nêu công thức pháp lý và mức thuế suất áp dụng theo căn cứ, KHÔNG tự tính nhẩm ra số tiền cuối cùng."
            ),
            formula_only=True,
        )

    revenue = _extract_labeled_vnd(q_norm, r"\b(?:tổng\s+)?doanh\s+thu(?:\s+năm\s+\d{4})?")
    deductible_exp = _extract_labeled_vnd(q_norm, r"\b(?:tổng\s+)?chi\s+phí(?:\s+được\s+trừ|\s+hợp\s+lệ)?")
    assessable_inc = _extract_labeled_vnd(q_norm, r"\bthu\s+nhập\s+chịu\s+thuế")
    taxable_inc = _extract_labeled_vnd(q_norm, r"\bthu\s+nhập\s+tính\s+thuế")
    exempt_inc = _extract_labeled_vnd(q_norm, r"\bthu\s+nhập\s+miễn\s+thuế") or 0.0
    loss_carry = _extract_labeled_vnd(
        q_norm, r"\b(?:chuyển\s+lỗ|lỗ\s+kết\s+chuyển|khoản\s+lỗ|số\s+lỗ|lỗ(?:\s+năm\s+(?:trước|\d{4}))?)"
    ) or 0.0

    net_taxable: float | None = None
    if taxable_inc is not None:
        net_taxable = (
            max(taxable_inc - loss_carry, 0.0)
            if ("chưa trừ lỗ" in q_norm or "trước khi chuyển lỗ" in q_norm)
            else taxable_inc
        )
    elif assessable_inc is not None:
        net_taxable = max(assessable_inc - exempt_inc - loss_carry, 0.0)
    elif revenue is not None and deductible_exp is not None:
        net_taxable = max(revenue - deductible_exp - exempt_inc - loss_carry, 0.0)

    if net_taxable is None:
        return CitCalcHint(
            prompt_block=(
                "HƯỚNG DẪN TÍNH THUẾ: Chỉ nêu công thức xác định thuế TNDN và mức thuế suất theo căn cứ; "
                "KHÔNG tự tính nhẩm ra con số không có trong câu hỏi."
            ),
            formula_only=True,
        )

    law_text = " ".join(str((hit.payload or {}).get("text_content") or "") for hit in retrieved_chunks).lower()
    explicit_rate_m = re.search(r"\bthuế\s+suất\s+(\d+(?:[.,]\d+)?)\s*%", q_norm)
    explicit_rate = parse_numeric_scalar(explicit_rate_m.group(1)) if explicit_rate_m else None
    rate = resolve_statutory_cit_rate(
        revenue_vnd=revenue,
        law_text=law_text,
        explicit_rate=explicit_rate,
        allow_standard_without_revenue_when_sme_present=False,
    )
    if rate is None:
        return CitCalcHint(
            prompt_block=(
                "HƯỚNG DẪN TÍNH THUẾ: Chưa đủ dữ kiện doanh thu để chốt duy nhất một mức thuế suất; "
                "hãy nêu công thức tính thuế và các mức thuế suất tương ứng trong căn cứ, KHÔNG tự chọn bừa để tính nhẩm."
            ),
            formula_only=True,
        )

    base_tax = net_taxable * (rate / 100.0)
    asks_reduction_30 = any(k in q_norm for k in ("giảm 30%", "nghị quyết 43", "nghị định 398")) and "30%" in law_text
    # When the user does not ask about it, the reduction is only mentioned as conditional: the payable figure
    # stays the pre-reduction amount (TT-02 expects 45 triệu, "chưa tính giảm 30% nếu đủ điều kiện").
    mention_reduction = (
        not asks_reduction_30
        and revenue is not None
        and revenue <= 10_000_000_000
        and "giảm 30%" in law_text
        and "10 tỷ" in law_text
    )
    final_tax = base_tax * 0.70 if asks_reduction_30 else base_tax
    reduced_tax = base_tax * 0.70

    authorized = (
        money_representations(net_taxable)
        | money_representations(base_tax)
        | money_representations(final_tax)
        | {normalize_number_token(str(rate))}
    )
    if asks_reduction_30 or mention_reduction:
        authorized |= money_representations(base_tax * 0.30) | money_representations(reduced_tax) | {"30", "70"}

    rate_str = str(int(rate)) if float(rate).is_integer() else str(rate).replace(".", ",")
    final_label = format_vnd_human(final_tax)
    steps = [f"- Thu nhập tính thuế = {format_vnd_human(net_taxable)}", f"- Thuế suất áp dụng = {rate_str}%"]
    if asks_reduction_30:
        steps.append(f"- Thuế TNDN trước giảm = {format_vnd_human(base_tax)}")
        steps.append(f"- Số thuế TNDN phải nộp sau khi giảm 30% = {final_label}")
    else:
        steps.append(f"- Số thuế TNDN phải nộp = {final_label}")
        if mention_reduction:
            steps.append(
                f"- Nếu đủ điều kiện giảm 30% theo đoạn căn cứ thì số thuế còn phải nộp = {format_vnd_human(reduced_tax)} "
                "(chỉ nêu như trường hợp có điều kiện)"
            )

    return CitCalcHint(
        prompt_block=(
            "KẾT QUẢ TÍNH THUẾ ĐÃ KIỂM TOÁN BẰNG CODE (BẮT BUỘC DÙNG ĐÚNG KẾT QUẢ NÀY, KHÔNG TỰ TÍNH KHÁC):\n"
            + "\n".join(steps)
        ),
        authorized_numbers=authorized,
        # TT-01 (expert-confirmed 31.5) and TT-02 (45, reduction left conditional) accept either figure.
        expected_tax_numbers=money_representations(final_tax)
        | (money_representations(reduced_tax) if mention_reduction else set()),
        expected_tax_label=final_label,
    )


_WELFARE_SALARY_RE = re.compile(
    r"lương\s+bình\s+quân(?:\s+(?:một|1|01))?\s+tháng[^0-9;\n]{0,15}?(\d+(?:[.,]\d+)?)\s*(tỷ|triệu|nghìn|ngàn|đồng)",
    re.IGNORECASE,
)
_WELFARE_SPEND_RE = re.compile(
    r"(?:chi\s+)?phúc\s+lợi[^0-9;\n]{0,30}?(\d+(?:[.,]\d+)?)\s*(tỷ|triệu|nghìn|ngàn|đồng)", re.IGNORECASE
)
_CAR_COST_RE = re.compile(r"nguyên\s+giá[^0-9;\n]{0,10}?(\d+(?:[.,]\d+)?)\s*(tỷ|triệu)", re.IGNORECASE)
_CAR_YEARS_RE = re.compile(r"khấu\s+hao[^0-9;\n]{0,20}?(\d+)\s*năm", re.IGNORECASE)
# "phần trích khấu hao tương ứng với nguyên giá vượt trên 1,6 tỷ đồng/xe" (passenger cars up to 9 seats).
_CAR_CAP_RE = re.compile(r"nguyên\s+giá\s+vượt\s+(?:trên\s+|quá\s+)?(\d+(?:[.,]\d+)?)\s*tỷ", re.IGNORECASE)


def _money(raw: str, unit: str) -> float | None:
    val = parse_numeric_scalar(raw.replace(",", ".") if re.fullmatch(r"\d+,\d+", raw) else raw)
    return val * UNIT_SCALE_VND[unit.lower()] if val is not None else None


def _cap_hint(lines: list[str], numbers: list[float], result: float, result_name: str) -> CitCalcHint:
    """Build a cap hint whose result, the non-deductible part, the conclusion must state (TT-06)."""
    authorized: set[str] = set()
    for amount in numbers:
        authorized |= money_representations(amount)
    return CitCalcHint(
        prompt_block="KẾT QUẢ TÍNH ĐÃ KIỂM TOÁN BẰNG CODE (BẮT BUỘC DÙNG ĐÚNG KẾT QUẢ NÀY, KHÔNG TỰ TÍNH KHÁC):\n"
        + "\n".join(lines),
        authorized_numbers=authorized,
        expected_tax_numbers=money_representations(result),
        expected_tax_label=format_vnd_human(result),
        expected_result_name=result_name,
    )


def compute_cap_excess_hint(question: str, retrieved_chunks: list) -> CitCalcHint | None:
    """Compute the non-deductible part above a statutory cap (welfare TT-05, passenger-car depreciation TT-06).

    The cap must be stated in a retrieved chunk; otherwise no figure is produced.
    """
    q_norm = " ".join((question or "").lower().split())
    law_text = " ".join(str((hit.payload or {}).get("text_content") or "") for hit in retrieved_chunks).lower()

    salary_m, welfare_m = _WELFARE_SALARY_RE.search(q_norm), _WELFARE_SPEND_RE.search(q_norm)
    if salary_m and welfare_m and "phúc lợi" in law_text and re.search(r"\b0?1\s+tháng\s+lương", law_text):
        salary, welfare = _money(*salary_m.groups()), _money(*welfare_m.groups())
        if salary is not None and welfare is not None:
            excess = max(welfare - salary, 0.0)
            return _cap_hint(
                [
                    f"- Mức chi phúc lợi tối đa được trừ = 01 tháng lương bình quân = {format_vnd_human(salary)}",
                    f"- Chi phúc lợi trong năm = {format_vnd_human(welfare)}",
                    f"- Phần chi phúc lợi vượt mức, không được trừ = {format_vnd_human(excess)}",
                ],
                [salary, welfare, excess],
                excess,
                "phần chi phúc lợi vượt mức, không được trừ",
            )

    cost_m, years_m = _CAR_COST_RE.search(q_norm), _CAR_YEARS_RE.search(q_norm)
    cap_m = _CAR_CAP_RE.search(law_text) if "ô tô" in law_text else None
    if "ô tô" in q_norm and cost_m and years_m and cap_m:
        cost = _money(*cost_m.groups())
        cap = _money(cap_m.group(1), "tỷ")
        years = int(years_m.group(1))
        if cost is not None and cap is not None and years > 0 and cost > cap:
            excess = cost - cap
            per_year = excess / years
            return _cap_hint(
                [
                    f"- Nguyên giá được trích khấu hao tối đa theo đoạn căn cứ = {format_vnd_human(cap)}",
                    f"- Phần nguyên giá vượt mức = {format_vnd_human(cost)} − {format_vnd_human(cap)} = {format_vnd_human(excess)}",
                    f"- Khấu hao phần vượt mỗi năm, không được trừ = {format_vnd_human(excess)} / {years} năm = {format_vnd_human(per_year)}",
                ],
                [cost, cap, excess, per_year],
                per_year,
                "phần khấu hao không được trừ mỗi năm",
            )
    return None
