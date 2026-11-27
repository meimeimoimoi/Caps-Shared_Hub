from app.core.ai_response import parse_ai_response
from app.core.models import llm_model
from app.core.text_utils import strip_vietnamese_accents
from app.modules.rag.period_parser import (
    extract_clarification_suffix,
    extract_unique_period_from_question,
    format_period_label,
    is_subperiod_of,
    parse_tax_period,
)
from app.modules.rag.prompts import build_scope_prompt
from app.schemas.ai_results import ScopeAnalysis
from app.schemas.answers import INVESTMENT_INCENTIVE_OUT_OF_SCOPE_ANSWER

_NON_CIT_KEYWORDS = (
    "giảm trừ gia cảnh", "người phụ thuộc", "thuế tncn", "thu nhập cá nhân",
    "biểu thuế lũy tiến", "thu nhập vãng lai", "hộ kinh doanh", "cá nhân kinh doanh",
    "thuế khoán", "thuế gtgt", "thuế giá trị gia tăng", "hoàn thuế gtgt",
    "khấu trừ thuế gtgt", "lệ phí môn bài", "thuế môn bài", "lệ phí trước bạ",
)
_EXPLICIT_CIT_TAX_KEYWORDS = (
    "tndn", "thu nhập doanh nghiệp", "cit", "chi phí được trừ", "chi phí không được trừ",
)
_DIRECT_INVESTMENT_INCENTIVE_PHRASES = (
    "ưu đãi đầu tư", "ưu đãi dự án đầu tư", "ưu đãi thuế theo dự án", "ưu đãi theo dự án",
    "địa bàn ưu đãi", "ngành nghề ưu đãi", "địa bàn có điều kiện kinh tế",
    "địa bàn kinh tế - xã hội", "địa bàn kinh tế xã hội",
)
_INVESTMENT_PROJECT_CONTEXT_KEYWORDS = (
    "dự án đầu tư", "dự án mới", "đầu tư mở rộng",
    "khu kinh tế", "khu công nghệ cao", "khu công nghiệp",
)
_INCENTIVE_INTENT_KEYWORDS = (
    "ưu đãi", "miễn thuế", "giảm thuế", "miễn giảm", "thuế suất ưu đãi",
    "thuế suất 10%", "10% trong 15 năm", "miễn 4 năm", "miễn 2 năm",
    "giảm 50%", "thời gian miễn", "thời gian giảm",
)
_PROMPT_LEAK_MARKERS = (
    "kỳ thuế do người dùng cung cấp", "kỳ thuế đi kèm",
    "user_tax_period", "period_start", "period_end",
)


def _is_obvious_non_cit_question(question: str) -> bool:
    """Catch unambiguous PIT, VAT, and household-business queries when no explicit CIT tax keyword is present."""
    normalized = " ".join(strip_vietnamese_accents(question).lower().split())
    if any(strip_vietnamese_accents(cit_kw) in normalized for cit_kw in _EXPLICIT_CIT_TAX_KEYWORDS):
        return False
    return any(strip_vietnamese_accents(non_cit_kw) in normalized for non_cit_kw in _NON_CIT_KEYWORDS)


def _is_investment_incentive_question(question: str) -> bool:
    """Block only investment-project tax incentives (spec 3a), keeping regular CIT rules for projects/zones."""
    normalized = " ".join(strip_vietnamese_accents(question).lower().split())
    if any(strip_vietnamese_accents(p) in normalized for p in _DIRECT_INVESTMENT_INCENTIVE_PHRASES):
        return True
    has_project_or_zone = any(
        strip_vietnamese_accents(k) in normalized for k in _INVESTMENT_PROJECT_CONTEXT_KEYWORDS
    )
    has_incentive_intent = any(
        strip_vietnamese_accents(k) in normalized for k in _INCENTIVE_INTENT_KEYWORDS
    )
    return has_project_or_zone and has_incentive_intent


def _sanitize_clarification_msg(msg: str | None) -> str | None:
    if not msg:
        return None
    cleaned = " ".join(msg.strip().split())
    if not cleaned or cleaned.lower() in ("null", "none", "..."):
        return None
    if any(marker in cleaned.lower() for marker in _PROMPT_LEAK_MARKERS):
        return None
    return cleaned


class ScopeRouter:
    """Determines whether a question is in CIT scope and resolves its applicable tax period."""

    @staticmethod
    def analyze(question: str, user_tax_period: str | None = None) -> ScopeAnalysis:
        if _is_investment_incentive_question(question):
            return ScopeAnalysis(
                is_cit=False,
                period_start=None,
                period_end=None,
                needs_clarification=False,
                clarification_msg=None,
                out_of_scope_msg=INVESTMENT_INCENTIVE_OUT_OF_SCOPE_ANSWER,
            )

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
        clarification_suffix = extract_clarification_suffix(question)
        clarification_period = parse_tax_period(clarification_suffix)
        if clarification_period is None and clarification_suffix:
            for line in reversed(clarification_suffix.splitlines()):
                if clarification_period := parse_tax_period(line):
                    break
        if clarification_period is None and clarification_suffix:
            clarification_period = extract_unique_period_from_question(clarification_suffix)

        question_only = (
            question[: question.lower().rfind("clarification:")].strip()
            if clarification_suffix
            else question
        )
        question_period = extract_unique_period_from_question(question_only)

        if clarification_period is not None:
            resolved_period = clarification_period
        elif explicit_period is not None and question_period is not None and explicit_period != question_period:
            if is_subperiod_of(question_period, explicit_period):
                resolved_period = explicit_period
            else:
                return ScopeAnalysis(
                    is_cit=True,
                    period_start=None,
                    period_end=None,
                    needs_clarification=True,
                    clarification_msg=(
                        f"Câu hỏi của bạn nhắc tới kỳ {format_period_label(question_period)}, "
                        f"nhưng kỳ thuế đang chọn là {format_period_label(explicit_period)}. "
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


__all__ = ["ScopeRouter", "parse_tax_period", "strip_vietnamese_accents"]
