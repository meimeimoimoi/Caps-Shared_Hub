"""Regression tests for answers blocked by mistake in the v1.0 eval run of 28/11 (TS-03, TS-04, CP-14, task 23)."""

from pathlib import Path
import sys
from types import SimpleNamespace
import unittest

AI_SERVICE_ROOT = Path(__file__).resolve().parents[1]
if str(AI_SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(AI_SERVICE_ROOT))

from app.config import settings  # noqa: E402
from app.modules.rag.guardrails import (  # noqa: E402
    _same_lead_word,
    backfill_sources_for_figures,
    find_ungrounded_numbers,
    mismatched_bracket_rate,
)

PERIOD = "2026-01-01 đến 2026-12-31"
STANDARD = "Thuế suất thuế thu nhập doanh nghiệp là 20%, trừ trường hợp quy định tại khoản 2, khoản 3 Điều này."
SME_15 = "Thuế suất 15% áp dụng đối với doanh nghiệp có tổng doanh thu năm không quá 03 tỷ đồng."
SME_17 = "Thuế suất 17% áp dụng đối với doanh nghiệp có tổng doanh thu năm từ trên 03 tỷ đồng đến không quá 50 tỷ đồng."
RATE_CHUNKS_TEXT = (STANDARD, SME_15, SME_17)


def _hit(text: str, doc: str = "67/2025/QH15"):
    return SimpleNamespace(id=0, score=0.8, payload={"text_content": text, "document_number": doc})


class SentenceEndPeriodBackfillTests(unittest.TestCase):
    """TS-04: "là 20%." cited the 17% clause; the trailing period stopped the 20% clause from being backfilled."""

    def test_figure_before_sentence_end_period_is_backfilled(self):
        sme_17, standard = _hit(SME_17), _hit(STANDARD)
        used = backfill_sources_for_figures(
            "Doanh nghiệp có doanh thu năm 60 tỷ đồng thì thuế suất TNDN là bao nhiêu?",
            "Thuế suất TNDN là 20%.",
            [sme_17],
            [sme_17, _hit(SME_15), standard],
            period_str=PERIOD,
        )
        self.assertIsNotNone(used)
        self.assertTrue(any(hit is standard for hit in used))

    def test_longer_decimal_number_is_still_not_matched(self):
        # "là 20.5%" must not be treated as the clause's "là 20%".
        self.assertFalse(_same_lead_word("Thuế suất là 20.5%.", _hit("Thuế suất là 20"), "20"))
        self.assertFalse(_same_lead_word("Thuế suất là 20,5%.", _hit("Thuế suất là 20"), "20"))


class RevenueRangeBracketTests(unittest.TestCase):
    """TS-03: a question naming the whole 3–50 billion bracket was read as revenue = 3 billion (15%)."""

    def test_question_with_revenue_range_is_not_forced_to_lower_bound(self):
        note = mismatched_bracket_rate(
            "Doanh nghiệp có tổng doanh thu năm từ trên 3 tỷ đến không quá 50 tỷ đồng "
            "áp dụng thuế suất TNDN bao nhiêu trong năm 2026?",
            "Doanh nghiệp có tổng doanh thu năm từ trên 3 tỷ đến không quá 50 tỷ đồng áp dụng thuế suất 17% [1, 2].",
            [_hit(text) for text in RATE_CHUNKS_TEXT],
        )
        self.assertIsNone(note)

    def test_single_revenue_figure_is_still_checked(self):
        note = mismatched_bracket_rate(
            "Doanh nghiệp có doanh thu năm 60 tỷ đồng thì thuế suất TNDN là bao nhiêu?",
            "Thuế suất TNDN là 17% [1].",
            [_hit(text) for text in RATE_CHUNKS_TEXT],
        )
        self.assertIsNotNone(note)
        self.assertIn("20%", note)


class QuestionFigureInWrongAnswerTests(unittest.TestCase):
    """CP-14: the blocked answer ("được trừ toàn bộ lãi suất 30%/năm") was wrong, so the block must stay."""

    def test_question_rate_repeated_in_affirmative_conclusion_is_still_flagged(self):
        flagged = find_ungrounded_numbers(
            "Công ty vay tiền của cá nhân (không phải ngân hàng), lãi suất 30%/năm. Có được trừ toàn bộ lãi không?",
            "Công ty có thể được trừ toàn bộ lãi suất 30%/năm khi xác định chi phí [1].",
            [_hit("Chi phí lãi vay được trừ khi có hợp đồng vay và chứng từ thanh toán.", doc="20/2026/TT-BTC")],
            PERIOD,
        )
        self.assertIn("30%", flagged)


class OllamaSeedTests(unittest.TestCase):
    """Task 23: TS-01 flipped between 17% and 20% on the same container because no seed was set."""

    def test_llm_calls_carry_a_fixed_seed(self):
        from app.core.models import llm_model

        self.assertEqual(llm_model.kwargs.get("seed"), settings.OLLAMA_SEED)


if __name__ == "__main__":
    unittest.main()
