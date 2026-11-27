"""Regression tests for the rejection causes found in the 28/11 ai-service logs (B1, G05, N04, A1, I05)."""

from pathlib import Path
import sys
from types import SimpleNamespace
import unittest

AI_SERVICE_ROOT = Path(__file__).resolve().parents[1]
if str(AI_SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(AI_SERVICE_ROOT))

from app.core.legal_refs import extract_document_numbers  # noqa: E402
from app.modules.rag.generator import _renumber_markers  # noqa: E402
from app.modules.rag.guardrails import (  # noqa: E402
    backfill_sources_for_figures,
    citation_indexes,
    find_ungrounded_numbers,
)
from app.modules.rag.retriever import _cap_hits_per_document, needs_rate_clauses  # noqa: E402

PERIOD = "2026-01-01 đến 2026-12-31"
STANDARD = "Thuế suất thuế thu nhập doanh nghiệp là 20%, trừ trường hợp quy định tại khoản 2, khoản 3 Điều này."
SME_15 = "Thuế suất 15% áp dụng đối với doanh nghiệp có tổng doanh thu năm không quá 03 tỷ đồng."
SME_17 = "Thuế suất 17% áp dụng đối với doanh nghiệp có tổng doanh thu năm từ trên 03 tỷ đồng đến không quá 50 tỷ đồng."
REDUCTION = "Giảm 30% số thuế thu nhập doanh nghiệp phải nộp của kỳ tính thuế năm 2026."


def _hit(text: str, doc: str = "67/2025/QH15", hit_id: int = 0):
    return SimpleNamespace(id=hit_id, score=0.8, payload={"text_content": text, "document_number": doc})


class CitationMarkerTests(unittest.TestCase):
    def test_list_and_range_inside_one_bracket(self):
        self.assertEqual(citation_indexes("là 17% [3, 6]; xem [1-3] và [8]"), {1, 2, 3, 6, 8})

    def test_list_marker_numbers_are_not_ungrounded(self):
        # G05 without accents: "[3, 6]" left "6" behind as an ungrounded number.
        conclusion = "Thuế suất TNDN của doanh nghiệp có doanh thu 2 tỷ đồng năm 2026 là 15% [1, 2]."
        flagged = find_ungrounded_numbers(
            "thue suat tndn cty doanh thu 2 ty nam 2026", conclusion, [_hit(SME_15), _hit(SME_17)], PERIOD
        )
        self.assertEqual(flagged, [])

    def test_renumber_keeps_every_index_of_a_list_marker(self):
        self.assertEqual(_renumber_markers("là 20% [4, 10].", {4: 1, 10: 2}), "là 20% [1, 2].")


class DateSpanTests(unittest.TestCase):
    def test_calendar_date_is_not_a_duration(self):
        # A1: "ngày 31 tháng 03 năm 2027" was read as the duration "31 tháng".
        chunk = _hit("Hồ sơ quyết toán thuế năm nộp chậm nhất là ngày cuối cùng của tháng thứ 3, tức ngày 31 tháng 03.")
        conclusion = "Hạn nộp hồ sơ quyết toán kỳ 2026 là ngày 31 tháng 03 năm 2027 [1]."
        flagged = find_ungrounded_numbers("Hạn nộp quyết toán kỳ 2026 là ngày nào?", conclusion, [chunk], PERIOD)
        self.assertNotIn("31 tháng", flagged)
        self.assertEqual(flagged, [])

    def test_real_duration_is_still_checked(self):
        flagged = find_ungrounded_numbers("Khấu hao xe?", "Khấu hao không quá 03 năm [1].", [_hit(STANDARD)], PERIOD)
        self.assertIn("03 năm", flagged)

    def test_month_of_year_is_not_a_document_number(self):
        # I05: "tháng 8/2026" was flagged as unknown document 8/2026.
        self.assertEqual(extract_document_numbers("giải thể vào tháng 8/2026 theo Nghị định 320/2025/NĐ-CP"), {"320/2025"})
        self.assertEqual(extract_document_numbers("quý 3/2026"), set())


class RetrievalDiversityTests(unittest.TestCase):
    def test_one_document_cannot_fill_every_slot(self):
        # N04, G05: all ten hits came from Decree 398/2026 and pushed out the rate clause.
        ranked = [_hit(f"đoạn {i}", "398/2026/NĐ-CP", i) for i in range(8)] + [_hit(SME_15, "67/2025/QH15", 99)]
        picked = _cap_hits_per_document(ranked, 5)
        self.assertEqual(len(picked), 5)
        self.assertIn(99, [h.id for h in picked])

    def test_refills_when_only_one_document_exists(self):
        ranked = [_hit(f"đoạn {i}", "398/2026/NĐ-CP", i) for i in range(8)]
        self.assertEqual(len(_cap_hits_per_document(ranked, 6)), 6)

    def test_tax_amount_question_without_rate_clause_needs_it(self):
        question = "Công ty doanh thu 2 tỷ, thu nhập tính thuế năm 2026 là 300 triệu. Phải nộp bao nhiêu thuế TNDN?"
        self.assertTrue(needs_rate_clauses(question, [_hit(REDUCTION, "398/2026/NĐ-CP")]))
        self.assertFalse(needs_rate_clauses(question, [_hit(STANDARD), _hit(SME_15)]))

    def test_rate_question_needs_rate_clause(self):
        self.assertTrue(needs_rate_clauses("Thuế suất TNDN cho lãi bán bất động sản là bao nhiêu?", [_hit("Điều 3")]))
        self.assertFalse(needs_rate_clauses("Chi phúc lợi được trừ tối đa bao nhiêu?", [_hit("Điều 3")]))


class BackfillSourceTests(unittest.TestCase):
    def test_figure_from_other_retrieved_chunk_is_cited(self):
        # B1: 20% was in hits 4 and 10 but the model cited the 15% and 17% clauses.
        cited = [_hit(SME_15), _hit(SME_17)]
        retrieved = cited + [_hit(STANDARD)]
        conclusion = "Thuế suất thuế TNDN phổ thông kỳ 2026 là 20% [1, 2]."
        backed = backfill_sources_for_figures("Thuế suất phổ thông 2026?", conclusion, cited, retrieved, PERIOD)
        self.assertIsNotNone(backed)
        self.assertEqual(len(backed), 3)

    def test_same_number_in_another_role_is_not_accepted(self):
        # N15: "giảm 20%" must not pass because "là 20%" exists in the rate clause.
        cited = [_hit(REDUCTION, "398/2026/NĐ-CP")]
        retrieved = cited + [_hit(STANDARD)]
        conclusion = "Doanh nghiệp được giảm 20% số thuế TNDN phải nộp [1]."
        self.assertIsNone(backfill_sources_for_figures("Được giảm bao nhiêu?", conclusion, cited, retrieved, PERIOD))


if __name__ == "__main__":
    unittest.main()
