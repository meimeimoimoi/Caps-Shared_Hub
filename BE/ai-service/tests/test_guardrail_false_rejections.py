from pathlib import Path
import sys
from types import SimpleNamespace
import unittest

AI_SERVICE_ROOT = Path(__file__).resolve().parents[1]
if str(AI_SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(AI_SERVICE_ROOT))

from app.modules.rag.cit_calculator import compute_chat_cit_hint  # noqa: E402
from app.modules.rag.guardrails import (  # noqa: E402
    find_ungrounded_numbers,
    mismatched_bracket_rate,
)

PERIOD = "2026-01-01 đến 2026-12-31"
RATES = (
    "Thuế suất thuế thu nhập doanh nghiệp là 20%. "
    "Thuế suất 15% áp dụng đối với doanh nghiệp có tổng doanh thu năm không quá 03 tỷ đồng. "
    "Thuế suất 17% áp dụng đối với doanh nghiệp có tổng doanh thu năm từ trên 03 tỷ đồng đến không quá 50 tỷ đồng."
)
LOSS = "Thời gian chuyển lỗ liên tục không quá 05 năm, kể từ năm tiếp theo năm phát sinh lỗ."
REDUCTION = (
    "Giảm 30% số thuế thu nhập doanh nghiệp phải nộp của kỳ tính thuế năm 2026 đối với doanh nghiệp "
    "có tổng doanh thu năm 2026 không quá 10 tỷ đồng."
)


def _hit(text: str):
    return SimpleNamespace(score=0.8, payload={"text_content": text, "document_number": "67/2025/QH15"})


class NearbyYearTests(unittest.TestCase):
    def test_year_after_period_is_not_ungrounded(self):
        question = "Doanh nghiệp bị lỗ năm 2026 được chuyển lỗ tối đa bao nhiêu năm?"
        conclusion = "Doanh nghiệp được chuyển lỗ liên tục không quá 5 năm, kể từ năm 2027 [1]."
        self.assertEqual(find_ungrounded_numbers(question, conclusion, [_hit(LOSS)], period_str=PERIOD), [])

    def test_far_year_is_still_ungrounded(self):
        conclusion = "Doanh nghiệp được chuyển lỗ đến năm 2040 [1]."
        self.assertIn("2040", find_ungrounded_numbers("Chuyển lỗ?", conclusion, [_hit(LOSS)], period_str=PERIOD))


class CalculationHintTests(unittest.TestCase):
    def test_period_year_between_label_and_amount_still_computes(self):
        question = "Công ty doanh thu 2 tỷ, thu nhập tính thuế năm 2026 là 300 triệu. Phải nộp bao nhiêu thuế TNDN?"
        hint = compute_chat_cit_hint(question, [_hit(RATES), _hit(REDUCTION)])
        self.assertIsNotNone(hint)
        self.assertFalse(hint.formula_only)
        # 300 million x 15% = 45 million, reduced by 30% under the cited rule = 31.5 million.
        self.assertIn("31.5", hint.expected_tax_numbers)

    def test_reduction_not_applied_above_threshold(self):
        question = "Công ty doanh thu 12 tỷ, thu nhập tính thuế năm 2026 là 1 tỷ. Phải nộp bao nhiêu thuế TNDN?"
        hint = compute_chat_cit_hint(question, [_hit(RATES), _hit(REDUCTION)])
        self.assertIn("170", hint.expected_tax_numbers)


class RateEchoTests(unittest.TestCase):
    def test_rate_echoed_from_false_premise_is_ungrounded(self):
        question = "Thuế suất thuế TNDN phổ thông là 22% đúng không?"
        conclusion = "Đúng, thuế suất thuế TNDN phổ thông là 22% [1]."
        self.assertIn("22%", find_ungrounded_numbers(question, conclusion, [_hit(RATES)], period_str=PERIOD))

    def test_rate_rejected_in_negated_clause_is_allowed(self):
        question = "Thuế suất thuế TNDN phổ thông là 22% đúng không?"
        conclusion = "Không đúng, không phải 22% mà là 20% [1]."
        self.assertEqual(find_ungrounded_numbers(question, conclusion, [_hit(RATES)], period_str=PERIOD), [])

    def test_rate_from_source_is_allowed(self):
        conclusion = "Thuế suất thuế TNDN phổ thông là 20% [1]."
        self.assertEqual(find_ungrounded_numbers("Thuế suất?", conclusion, [_hit(RATES)], period_str=PERIOD), [])


class BracketRateTests(unittest.TestCase):
    QUESTION = "Doanh nghiệp có doanh thu năm 60 tỷ đồng thì thuế suất TNDN là bao nhiêu?"

    def test_rate_outside_revenue_bracket_is_flagged(self):
        self.assertIsNotNone(mismatched_bracket_rate(self.QUESTION, "Áp dụng thuế suất 17% [1].", [_hit(RATES)]))

    def test_matching_rate_passes(self):
        self.assertIsNone(mismatched_bracket_rate(self.QUESTION, "Áp dụng thuế suất 20% [1].", [_hit(RATES)]))

    def test_question_without_revenue_is_ignored(self):
        self.assertIsNone(mismatched_bracket_rate("Thuế suất phổ thông?", "Thuế suất 17% [1].", [_hit(RATES)]))


if __name__ == "__main__":
    unittest.main()
