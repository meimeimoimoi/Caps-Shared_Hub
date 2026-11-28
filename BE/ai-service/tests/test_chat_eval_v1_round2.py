"""Round 2 fixes from the CIT AI evaluation set v1.0 (tasks 19 and 21): rate by bracket, cap calculators, clarifications."""

from pathlib import Path
import sys
from types import SimpleNamespace
import unittest

AI_SERVICE_ROOT = Path(__file__).resolve().parents[1]
if str(AI_SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(AI_SERVICE_ROOT))

from app.modules.rag.cit_calculator import (  # noqa: E402
    compute_cap_excess_hint,
    compute_chat_cit_hint,
    detect_missing_case_clarification,
)
from app.modules.rag.guardrails import (  # noqa: E402
    mismatched_bracket_rate,
    mismatched_reduction_eligibility,
)

RATES = (
    "Thuế suất thuế thu nhập doanh nghiệp là 20%. "
    "Thuế suất 15% áp dụng đối với doanh nghiệp có tổng doanh thu năm không quá 03 tỷ đồng. "
    "Thuế suất 17% áp dụng đối với doanh nghiệp có tổng doanh thu năm từ trên 03 tỷ đồng đến không quá 50 tỷ đồng."
)
SME_ONLY = "Thuế suất 17% áp dụng đối với doanh nghiệp có tổng doanh thu năm từ trên 03 tỷ đồng đến không quá 50 tỷ đồng."
REDUCTION = (
    "Giảm 30% số thuế thu nhập doanh nghiệp phải nộp của kỳ tính thuế năm 2026 đối với doanh nghiệp "
    "có tổng doanh thu năm 2026 không quá 10 tỷ đồng."
)
LOSS = "Thời gian chuyển lỗ liên tục không quá 05 năm, kể từ năm tiếp theo năm phát sinh lỗ."
WELFARE = (
    "Khoản chi có tính chất phúc lợi chi trực tiếp cho người lao động, tổng số chi không quá 01 tháng lương "
    "bình quân thực tế thực hiện trong năm tính thuế."
)
CAR = (
    "Phần trích khấu hao tương ứng với nguyên giá vượt trên 1,6 tỷ đồng/xe đối với ô tô chở người từ 9 chỗ "
    "ngồi trở xuống không được trừ."
)


def _hit(text: str):
    return SimpleNamespace(score=0.8, payload={"text_content": text, "document_number": "67/2025/QH15"})


class BracketRateTests(unittest.TestCase):
    def test_ts01_general_rate_is_twenty_percent(self):
        question = "Thuế suất thuế TNDN phổ thông áp dụng cho kỳ tính thuế 2026 là bao nhiêu?"
        self.assertIsNotNone(mismatched_bracket_rate(question, "Thuế suất 15% [1].", [_hit(RATES)]))
        self.assertIsNone(mismatched_bracket_rate(question, "Thuế suất phổ thông là 20% [1].", [_hit(RATES)]))

    def test_ts05_unaccented_revenue_selects_fifteen_percent(self):
        question = "thue suat tndn cty doanh thu 2 ty nam 2026 la bao nhieu"
        self.assertIsNotNone(mismatched_bracket_rate(question, "Thuế suất 20% [1].", [_hit(RATES)]))
        self.assertIsNone(mismatched_bracket_rate(question, "Thuế suất 15% [1].", [_hit(RATES)]))

    def test_ts11_false_premise_must_not_be_affirmed(self):
        question = "Doanh nghiệp doanh thu năm 5 tỷ được áp thuế suất 15% đúng không?"
        note = mismatched_bracket_rate(question, "Đúng, doanh nghiệp áp thuế suất 17% [1].", [_hit(RATES)])
        self.assertIsNotNone(note)
        self.assertIn("Sai", note)
        self.assertIsNone(
            mismatched_bracket_rate(question, "Sai, doanh nghiệp áp thuế suất 17% [1].", [_hit(RATES)])
        )

    def test_mg04_bracket_read_from_retrieved_chunks(self):
        question = "Công ty mới thành lập năm 2026, dự kiến doanh thu 2,5 tỷ thì tạm nộp thuế TNDN theo thuế suất nào?"
        # The model cited only the 17% clause; the 15% bracket is in another retrieved chunk.
        note = mismatched_bracket_rate(question, "Tạm nộp theo thuế suất 17% [1].", [_hit(SME_ONLY)], [_hit(RATES)])
        self.assertIsNotNone(note)


class ReductionEligibilityTests(unittest.TestCase):
    def test_mg07_reduction_denied_above_limit(self):
        question = "Doanh nghiệp doanh thu năm 15 tỷ có được giảm 30% thuế TNDN không?"
        self.assertIsNotNone(
            mismatched_reduction_eligibility(question, "Doanh nghiệp được giảm 30% thuế TNDN [1].", [_hit(REDUCTION)])
        )
        self.assertIsNone(
            mismatched_reduction_eligibility(
                question, "Doanh nghiệp không được giảm 30% vì doanh thu trên 10 tỷ [1].", [_hit(REDUCTION)]
            )
        )

    def test_reduction_within_limit_is_left_alone(self):
        question = "Doanh nghiệp doanh thu năm 8 tỷ có được giảm 30% thuế TNDN không?"
        self.assertIsNone(
            mismatched_reduction_eligibility(question, "Doanh nghiệp được giảm 30% thuế TNDN [1].", [_hit(REDUCTION)])
        )


class CalculatorTests(unittest.TestCase):
    def test_tt02_pre_reduction_tax_with_conditional_reduction(self):
        question = (
            "Doanh thu 2 tỷ, thu nhập chịu thuế 500 triệu, lỗ năm trước chuyển sang 200 triệu. "
            "Thuế TNDN phải nộp năm 2026 là bao nhiêu?"
        )
        hint = compute_chat_cit_hint(question, [_hit(RATES), _hit(REDUCTION), _hit(LOSS)])
        self.assertIsNotNone(hint)
        self.assertEqual(hint.expected_tax_label, "45 triệu đồng")
        self.assertIn("31.5", hint.authorized_numbers)
        self.assertIn("có điều kiện", hint.prompt_block)

    def test_tt05_welfare_above_one_month_salary(self):
        question = "Lương bình quân tháng là 100 triệu, chi phúc lợi trong năm là 150 triệu thì phần không được trừ là bao nhiêu?"
        hint = compute_cap_excess_hint(question, [_hit(WELFARE)])
        self.assertIsNotNone(hint)
        self.assertIn("50", hint.authorized_numbers)
        self.assertIn("50 triệu đồng", hint.prompt_block)

    def test_tt06_car_depreciation_above_cap(self):
        question = "Ô tô 9 chỗ nguyên giá 3 tỷ đồng, khấu hao đều 10 năm. Mỗi năm phần khấu hao không được trừ là bao nhiêu?"
        hint = compute_cap_excess_hint(question, [_hit(CAR)])
        self.assertIsNotNone(hint)
        self.assertIn("140", hint.authorized_numbers)
        self.assertIn("140 triệu đồng", hint.prompt_block)

    def test_cap_hint_needs_cap_in_law_text(self):
        question = "Ô tô 9 chỗ nguyên giá 3 tỷ đồng, khấu hao đều 10 năm. Mỗi năm phần khấu hao không được trừ là bao nhiêu?"
        self.assertIsNone(compute_cap_excess_hint(question, [_hit(RATES)]))


class ClarificationTests(unittest.TestCase):
    def _ask(self, question: str):
        return detect_missing_case_clarification(question, [_hit(RATES), _hit(REDUCTION), _hit(LOSS)])

    def test_cp18_unspecified_expense(self):
        note = self._ask("Khoản chi này của công ty tôi có được trừ không?")
        self.assertIsNotNone(note)
        self.assertIn("thanh toán", note)

    def test_lo07_loss_without_figures(self):
        note = self._ask("Công ty tôi lỗ năm trước thì năm nay được trừ bao nhiêu?")
        self.assertIsNotNone(note)
        self.assertIn("năm phát sinh lỗ", note)

    def test_mg12_reduction_without_facts(self):
        note = self._ask("Công ty tôi có được giảm thuế TNDN năm 2026 không?")
        self.assertIsNotNone(note)
        self.assertIn("ngành nghề", note)

    def test_tt08_calculation_without_figures(self):
        note = self._ask("Tính giúp tôi số thuế TNDN phải nộp năm 2026.")
        self.assertIsNotNone(note)
        self.assertIn("thu nhập tính thuế", note)

    def test_general_questions_are_answered(self):
        self.assertIsNone(self._ask("Doanh nghiệp bị lỗ được chuyển lỗ tối đa bao nhiêu năm?"))
        self.assertIsNone(self._ask("Công ty tôi doanh thu 2 tỷ, lỗ năm trước 100 triệu thì được chuyển lỗ không?"))


if __name__ == "__main__":
    unittest.main()
