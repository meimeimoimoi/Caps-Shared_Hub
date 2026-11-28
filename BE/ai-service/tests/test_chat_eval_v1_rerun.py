"""Fixes from the 28/11 ngrok rerun of the reranker branch: CP-03, TS-09, KK-10, TS-11, TT-06 and copied draft numbers."""

import json
from pathlib import Path
import sys
from types import SimpleNamespace
import unittest
from unittest.mock import patch

AI_SERVICE_ROOT = Path(__file__).resolve().parents[1]
if str(AI_SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(AI_SERVICE_ROOT))

from app.modules.drafting.drafter import DocumentDrafter  # noqa: E402
from app.modules.rag.cit_calculator import compute_cap_excess_hint  # noqa: E402
from app.modules.rag.generator import GroundedGenerator  # noqa: E402
from app.modules.rag.guardrails import (  # noqa: E402
    affirms_unsupported_premise,
    backfill_sources_for_figures,
    contradicts_non_deductible_rule,
    figures_in_text,
    find_ungrounded_numbers,
    mismatched_bracket_rate,
    missing_verified_tax_note,
)
from app.schemas.statuses import AnswerStatus  # noqa: E402

CASH = (
    "Nghị định 320/2025/NĐ-CP — Điều 9. Các khoản chi được trừ — Khoản 1 "
    "c) Trường hợp mua hàng hóa, dịch vụ của cùng một người bán nhiều lần trong cùng một ngày có tổng giá trị "
    "từ 05 triệu đồng trở lên thì chỉ được trừ khi có chứng từ thanh toán không dùng tiền mặt."
)
RATES = (
    "Thuế suất thuế thu nhập doanh nghiệp là 20%. "
    "Thuế suất 15% áp dụng đối với doanh nghiệp có tổng doanh thu năm không quá 03 tỷ đồng. "
    "Thuế suất 17% áp dụng đối với doanh nghiệp có tổng doanh thu năm từ trên 03 tỷ đồng đến không quá 50 tỷ đồng."
)
DEADLINE = (
    "Thời hạn nộp hồ sơ quyết toán thuế năm chậm nhất là ngày cuối cùng của tháng thứ 3 kể từ ngày kết thúc "
    "năm dương lịch hoặc năm tài chính."
)
LOSS = "Thời gian chuyển lỗ liên tục không quá 05 năm, kể từ năm tiếp theo năm phát sinh lỗ."
CAR = (
    "Phần trích khấu hao tương ứng với nguyên giá vượt trên 1,6 tỷ đồng/xe đối với ô tô chở người từ 9 chỗ "
    "ngồi trở xuống không được trừ."
)


def _hit(text: str):
    return SimpleNamespace(score=0.8, payload={"text_content": text, "document_number": "320/2025/NĐ-CP"})


class CashConclusionTests(unittest.TestCase):
    QUESTION = (
        "Trong một ngày công ty mua của cùng một người bán 3 lần, mỗi lần 3 triệu, đều trả tiền mặt. "
        "Có được tính chi phí không?"
    )

    def test_cp03_plain_yes_that_names_the_condition_is_flagged(self):
        # The rerun answer opened with "Có" and only mentioned the non-cash condition afterwards.
        answer = (
            "Có được tính chi phí vì tổng giá trị mua hàng hóa, dịch vụ từ 05 triệu đồng trở lên. Tuy nhiên, doanh "
            "nghiệp cần có chứng từ thanh toán không dùng tiền mặt khi thanh toán [1]."
        )
        self.assertIsNotNone(contradicts_non_deductible_rule(self.QUESTION, answer, [_hit(CASH)]))

    def test_cp03_conditional_answer_still_passes(self):
        answer = "Chỉ được tính chi phí khi có chứng từ thanh toán không dùng tiền mặt vì tổng là 9 triệu đồng [1]."
        self.assertIsNone(contradicts_non_deductible_rule(self.QUESTION, answer, [_hit(CASH)]))


class FalsePremiseTests(unittest.TestCase):
    def test_ts09_duration_not_in_law_is_not_affirmed(self):
        question = "Doanh nghiệp doanh thu 40 tỷ được áp dụng thuế suất 17% trong 10 năm đúng không?"
        note = affirms_unsupported_premise(question, "Đúng [1][2]", [_hit(RATES)])
        self.assertIsNotNone(note)
        self.assertIn("10 năm", note)
        self.assertIsNone(affirms_unsupported_premise(question, "Sai một phần: 17% không có thời hạn [1].", [_hit(RATES)]))

    def test_kk10_deadline_date_not_in_law_is_not_affirmed(self):
        question = "Hạn nộp hồ sơ quyết toán thuế TNDN năm 2026 là ngày 30/4/2027 đúng không?"
        note = affirms_unsupported_premise(question, "Đúng [1][2]", [_hit(DEADLINE)])
        self.assertIsNotNone(note)
        self.assertIn("30/4", note)

    def test_supported_premise_can_be_confirmed(self):
        question = "Lỗ được chuyển liên tục không quá 5 năm đúng không?"
        self.assertIsNone(affirms_unsupported_premise(question, "Đúng, tối đa 05 năm [1].", [_hit(LOSS)]))

    def test_period_year_is_not_a_duration(self):
        question = "Thuế suất 17% áp dụng cho kỳ tính thuế năm 2026 đúng không?"
        self.assertIsNone(affirms_unsupported_premise(question, "Đúng [1].", [_hit(RATES)]))

    def test_ts11_correct_rate_without_saying_wrong_is_flagged(self):
        question = "Doanh nghiệp doanh thu năm 5 tỷ được áp thuế suất 15% đúng không?"
        note = mismatched_bracket_rate(question, "Doanh nghiệp doanh thu năm 5 tỷ áp thuế suất 17% [1].", [_hit(RATES)])
        self.assertIsNotNone(note)
        self.assertIn("Sai", note)
        self.assertIsNone(mismatched_bracket_rate(question, "Sai, doanh thu 5 tỷ áp thuế suất 17% [1].", [_hit(RATES)]))


def _full_hit(text: str, doc_no: str = "320/2025/NĐ-CP"):
    return SimpleNamespace(
        score=0.7,
        payload={
            "legal_source_id": f"src-{doc_no}",
            "document_number": doc_no,
            "document_title": f"Văn bản {doc_no}",
            "article": "Điều 9",
            "clause": None,
            "point": None,
            "effective_from": "2025-12-15T00:00:00Z",
            "effective_to": None,
            "text_content": text,
        },
    )


class RejectionLogFixTests(unittest.TestCase):
    """Causes found in the 17:20 log of the 10 rejected questions (29f2b722)."""

    def test_cp03_total_named_by_the_retry_note_is_not_ungrounded(self):
        question = CashConclusionTests.QUESTION
        note = contradicts_non_deductible_rule(question, "Có được tính chi phí [1].", [_hit(CASH)])
        answer = "Không được trừ vì tổng 9 triệu đồng từ 05 triệu đồng trở lên phải có chứng từ không dùng tiền mặt [1]."
        self.assertEqual(find_ungrounded_numbers(question, answer, [_hit(CASH)]), ["9"])
        self.assertEqual(find_ungrounded_numbers(question, answer, [_hit(CASH)], extra_allowed=figures_in_text(note)), [])

    def test_cp03_retry_answer_is_accepted_end_to_end(self):
        question = CashConclusionTests.QUESTION
        replies = [
            {"answerable": True, "used_sources": [1], "conclusion": "Có được tính chi phí [1]."},
            {
                "answerable": True,
                "used_sources": [1],
                "conclusion": "Không được trừ vì tổng 9 triệu đồng từ 05 triệu đồng trở lên phải có chứng từ "
                "thanh toán không dùng tiền mặt [1].",
            },
        ]
        with patch("app.modules.rag.generator.llm_model") as mock_llm:
            mock_llm.invoke.side_effect = [SimpleNamespace(content=json.dumps(r, ensure_ascii=False)) for r in replies]
            result = GroundedGenerator.generate_answer(question, [_full_hit(CASH)], "2026-01-01 đến 2026-12-31")
        self.assertEqual(mock_llm.invoke.call_count, 2)
        self.assertEqual(result["answer_status"], AnswerStatus.ANSWERED)

    def test_ts04_bracket_rate_cited_from_the_wrong_clause_is_backfilled(self):
        question = "Doanh nghiệp có doanh thu năm 60 tỷ đồng thì thuế suất TNDN là bao nhiêu?"
        sme = _hit("Thuế suất 17% áp dụng đối với doanh nghiệp có tổng doanh thu năm từ trên 03 tỷ đồng "
                   "đến không quá 50 tỷ đồng.")
        general = _hit(RATES)
        conclusion = "Thuế suất TNDN 20% [1]."
        self.assertTrue(find_ungrounded_numbers(question, conclusion, [sme]))
        backfilled = backfill_sources_for_figures(question, conclusion, [sme], [sme, general])
        self.assertIsNotNone(backfilled)
        self.assertIs(backfilled[-1], general)

    def test_ts04_wrong_rate_is_still_not_backfilled(self):
        question = "Doanh nghiệp có doanh thu năm 60 tỷ đồng thì thuế suất TNDN là bao nhiêu?"
        sme = _hit("Thuế suất 15% áp dụng đối với doanh nghiệp có tổng doanh thu năm không quá 03 tỷ đồng.")
        other = _hit("Áp dụng thuế suất 10% trong thời hạn 15 năm đối với dự án đầu tư mới.")
        self.assertIsNone(backfill_sources_for_figures(question, "Thuế suất TNDN 10% [1].", [sme], [sme, other, _hit(RATES)]))

    def test_premise_note_spells_out_the_opening(self):
        question = "Doanh nghiệp doanh thu 40 tỷ được áp dụng thuế suất 17% trong 10 năm đúng không?"
        note = affirms_unsupported_premise(question, "Đúng [1][2]", [_hit(RATES)])
        self.assertIn("BẮT BUỘC mở đầu bằng chữ 'Sai'", note)
        self.assertIn("không quy định 10 năm", note)


class CapResultTests(unittest.TestCase):
    QUESTION = "Ô tô 9 chỗ nguyên giá 3 tỷ đồng, khấu hao đều 10 năm. Mỗi năm phần khấu hao không được trừ là bao nhiêu?"

    def test_tt06_conclusion_must_state_yearly_figure(self):
        hint = compute_cap_excess_hint(self.QUESTION, [_hit(CAR)])
        wrong = "Phần trích khấu hao vượt 1,6 tỷ đồng/xe không được trừ khi xác định thu nhập chịu thuế. [1]"
        note = missing_verified_tax_note(wrong, hint)
        self.assertIsNotNone(note)
        self.assertIn("140 triệu đồng", note)
        self.assertIn("khấu hao", note)
        self.assertIsNone(missing_verified_tax_note("Mỗi năm 140 triệu đồng không được trừ [1].", hint))


class DraftCopiedNumbersTests(unittest.TestCase):
    SNAPSHOT = {"companyName": "Công ty B", "taxCode": "0312345678"}
    TEMPLATE = [{"id": "noi_dung_giai_trinh", "label": "Nội dung", "required": True}]
    LAW = "Nghị định 141/2026/NĐ-CP, Điều 2: doanh nghiệp có doanh thu không quá 1 tỷ đồng được miễn thuế."

    def _reply(self, text: str):
        return SimpleNamespace(content=json.dumps({"noi_dung_giai_trinh": text}, ensure_ascii=False))

    def test_sh03_draft_with_sample_tax_code_is_drafted_again(self):
        citations = [{"document_number": "141/2026/NĐ-CP", "article": "Điều 2"}]
        with patch("app.modules.drafting.drafter.llm_model") as mock_llm:
            mock_llm.invoke.side_effect = [
                self._reply("Doanh nghiệp A, mã số thuế 01000123456, doanh thu 850 triệu đồng."),
                self._reply("Công ty B, mã số thuế 0312345678, giải trình theo Nghị định 141/2026/NĐ-CP."),
            ]
            result = DocumentDrafter.generate_draft(self.SNAPSHOT, self.TEMPLATE, self.LAW, citations=citations)
        self.assertEqual(mock_llm.invoke.call_count, 2)
        self.assertIn("01000123456", mock_llm.invoke.call_args_list[1].args[0])
        self.assertFalse(result["has_unauthorized_numbers"])

    def test_invalid_redraft_keeps_the_flagged_first_draft(self):
        citations = [{"document_number": "141/2026/NĐ-CP", "article": "Điều 2"}]
        with patch("app.modules.drafting.drafter.llm_model") as mock_llm:
            mock_llm.invoke.side_effect = [
                self._reply("Doanh nghiệp A, mã số thuế 01000123456."),
                SimpleNamespace(content="not json"),
            ]
            result = DocumentDrafter.generate_draft(self.SNAPSHOT, self.TEMPLATE, self.LAW, citations=citations)
        self.assertEqual(mock_llm.invoke.call_count, 2)
        self.assertTrue(result["has_unauthorized_numbers"])
        self.assertIn("01000123456", result["unauthorized_numbers"])


if __name__ == "__main__":
    unittest.main()
