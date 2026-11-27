import json
from pathlib import Path
import sys
from types import SimpleNamespace
import unittest
from unittest.mock import patch

AI_SERVICE_ROOT = Path(__file__).resolve().parents[1]
if str(AI_SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(AI_SERVICE_ROOT))

from app.core.legal_refs import extract_document_numbers  # noqa: E402
from app.modules.rag.generator import GroundedGenerator  # noqa: E402
from app.modules.rag.router import ScopeRouter  # noqa: E402
from app.schemas.answers import (  # noqa: E402
    INVESTMENT_INCENTIVE_OUT_OF_SCOPE_ANSWER,
    UNSUPPORTED_QUESTION_ANSWER,
)

PERIOD = "2026-01-01 đến 2026-12-31"
QUESTION = "Thuế suất thuế TNDN phổ thông năm 2026 là bao nhiêu?"


def _hit(doc_no: str, article: str, text: str, score: float = 0.7):
    return SimpleNamespace(
        score=score,
        payload={
            "legal_source_id": f"src-{doc_no}",
            "document_number": doc_no,
            "document_title": f"Văn bản {doc_no}",
            "article": article,
            "clause": None,
            "point": None,
            "effective_from": "2026-01-01T00:00:00Z",
            "effective_to": None,
            "text_content": text,
        },
    )


def _hits():
    return [
        _hit("20/2026/TT-BTC", "Điều 3", "Hồ sơ khoản chi tài trợ theo Mẫu số 01/TNDN."),
        _hit("398/2026/NĐ-CP", "Điều 3", "Giảm 30% thuế TNDN theo Nghị quyết số 43/2026/QH16."),
        _hit("67/2025/QH15", "Điều 10", "Thuế suất thuế thu nhập doanh nghiệp là 20%."),
    ]


def _reply(payload) -> SimpleNamespace:
    content = payload if isinstance(payload, str) else json.dumps(payload, ensure_ascii=False)
    return SimpleNamespace(content=content)


def _answer(**overrides) -> dict:
    data = {
        "answerable": True,
        "used_sources": [3],
        "conclusion": "Thuế suất phổ thông là 20% [3].",
    }
    data.update(overrides)
    return data


def _generate(*replies):
    with patch("app.modules.rag.generator.llm_model") as mock_llm:
        mock_llm.invoke.side_effect = [_reply(r) for r in replies]
        result = GroundedGenerator.generate_answer(QUESTION, _hits(), PERIOD)
    return result, mock_llm.invoke.call_count


class AnswerGatingTests(unittest.TestCase):
    """BR-C10/BR-C13: refuse when the retrieved sources do not answer the question."""

    def test_not_answerable_is_rejected_without_citations(self):
        result, _ = _generate(_answer(answerable=False, used_sources=[], conclusion=""))
        self.assertEqual(result["answer_status"], "REJECTED")
        self.assertEqual(result["answer"], UNSUPPORTED_QUESTION_ANSWER)
        self.assertEqual(result["citations"], [])

    def test_answer_without_any_used_source_is_rejected(self):
        result, _ = _generate(
            _answer(used_sources=[], conclusion="Là 20%.")
        )
        self.assertEqual(result["answer_status"], "REJECTED")

    def test_marker_outside_retrieved_sources_is_rejected(self):
        result, _ = _generate(_answer(conclusion="Thuế suất là 20% [9]."))
        self.assertEqual(result["answer_status"], "REJECTED")

    def test_malformed_json_is_rejected_instead_of_leaking(self):
        result, _ = _generate('{"answerable": true, "conclusion": "Thuế suất là 20% [3]')
        self.assertEqual(result["answer_status"], "REJECTED")
        self.assertNotIn("{", result["answer"])


class UsedCitationTests(unittest.TestCase):
    """BR-C14: return only the sources the answer actually uses."""

    def test_only_used_sources_are_cited_and_markers_renumbered(self):
        result, _ = _generate(_answer(used_sources=[1, 2, 3]))
        self.assertEqual(result["answer_status"], "ANSWERED")
        self.assertEqual([c["document_number"] for c in result["citations"]], ["67/2025/QH15"])
        self.assertIn("20% [1]", result["answer"])
        self.assertNotIn("[3]", result["answer"])

    def test_declared_sources_are_used_when_text_has_no_markers(self):
        result, _ = _generate(
            _answer(
                used_sources=[2, 3],
                conclusion="Thuế suất phổ thông là 20%.",
            )
        )
        self.assertEqual(result["answer_status"], "ANSWERED")
        self.assertEqual(
            [c["document_number"] for c in result["citations"]],
            ["398/2026/NĐ-CP", "67/2025/QH15"],
        )

    def test_nested_json_conclusion_is_flattened(self):
        result, _ = _generate(
            _answer(conclusion={"facts": "Thuế suất phổ thông là 20% [3].", "note": "Theo luật."})
        )
        self.assertEqual(result["answer_status"], "ANSWERED")
        self.assertNotIn("{", result["answer"])
        self.assertIn("Thuế suất phổ thông là 20% [1].", result["answer"])


class FabricatedLegalBasisTests(unittest.TestCase):
    """Every legal document number in the answer must come from the used sources."""

    def test_fabricated_document_triggers_one_retry_then_answers(self):
        fabricated = _answer(conclusion="Theo Nghị định 15/2026/NĐ-CP, thuế suất là 20% [3].")
        result, calls = _generate(fabricated, _answer())
        self.assertEqual(calls, 2)
        self.assertEqual(result["answer_status"], "ANSWERED")
        self.assertNotIn("15/2026", result["answer"])

    def test_fabricated_document_twice_is_rejected(self):
        fabricated = _answer(conclusion="Theo Nghị định 39/2026/NĐ-CP, thuế suất là 20% [3].")
        result, calls = _generate(fabricated, fabricated)
        self.assertEqual(calls, 2)
        self.assertEqual(result["answer_status"], "REJECTED")
        self.assertEqual(result["citations"], [])

    def test_document_mentioned_inside_used_source_text_is_allowed(self):
        result, calls = _generate(
            _answer(
                used_sources=[2],
                conclusion="Doanh nghiệp được giảm 30% theo Nghị quyết 43/2026/QH16 [2].",
            )
        )
        self.assertEqual(calls, 1)
        self.assertEqual(result["answer_status"], "ANSWERED")

    def test_document_from_unused_source_is_not_allowed(self):
        unused_doc = _answer(conclusion="Thuế suất là 20% theo Thông tư 20/2026/TT-BTC [3].")
        result, calls = _generate(unused_doc, unused_doc)
        self.assertEqual(calls, 2)
        self.assertEqual(result["answer_status"], "REJECTED")

    def test_extract_document_numbers_ignores_dates(self):
        self.assertEqual(
            extract_document_numbers("Nghị định số 320/2025/NĐ-CP ngày 15/12/2025 và Nghị quyết 43/2026"),
            {"320/2025", "43/2026"},
        )

    def test_wrong_document_premise_in_question_cannot_be_echoed_as_source(self):
        # E08: question mentions Decree 320/2025, while retrieved source is Law 108/2025.
        hits = [
            _hit(
                "108/2025/QH15",
                "Điều 16",
                "Mức tính tiền chậm nộp bằng 0,03%/ngày tính trên số tiền thuế chậm nộp.",
            )
        ]
        wrong_attr = _answer(
            used_sources=[1],
            conclusion="Mức tiền chậm nộp theo Nghị định 320/2025/NĐ-CP là 0,03%/ngày [1].",
        )
        corrected = _answer(
            used_sources=[1],
            conclusion="Mức tính tiền chậm nộp là 0,03%/ngày theo Luật 108/2025/QH15 [1].",
        )
        with patch("app.modules.rag.generator.llm_model") as mock_llm:
            mock_llm.invoke.side_effect = [_reply(wrong_attr), _reply(corrected)]
            result = GroundedGenerator.generate_answer(
                "Tiền chậm nộp theo Nghị định 320/2025/NĐ-CP là bao nhiêu?",
                hits,
                PERIOD,
            )
        self.assertEqual(mock_llm.invoke.call_count, 2)
        self.assertEqual(result["answer_status"], "ANSWERED")
        self.assertIn("108/2025/QH15", result["answer"])
        self.assertNotIn("theo Nghị định 320/2025/NĐ-CP là 0,03%", result["answer"])

    def test_ungrounded_duration_or_cap_in_conclusion_triggers_retry(self):
        # E11 / A07: "10 năm" is not in the SME 17% source chunk and must be blocked unless negated.
        hits = [
            _hit(
                "67/2025/QH15",
                "Điều 10",
                "Thuế suất 17% áp dụng đối với doanh nghiệp có tổng doanh thu năm từ trên 03 tỷ đồng đến không quá 50 tỷ đồng.",
            )
        ]
        hallucinated = _answer(
            used_sources=[1],
            conclusion="Đúng, doanh nghiệp doanh thu 40 tỷ được áp dụng thuế suất 17% trong 10 năm [1].",
        )
        corrected = _answer(
            used_sources=[1],
            conclusion="Không đúng về thời hạn 10 năm. Doanh nghiệp có doanh thu 40 tỷ đồng được áp dụng mức thuế suất 17% và luật không giới hạn thời hạn 10 năm [1].",
        )
        with patch("app.modules.rag.generator.llm_model") as mock_llm:
            mock_llm.invoke.side_effect = [_reply(hallucinated), _reply(corrected)]
            result = GroundedGenerator.generate_answer(
                "Doanh thu 40 tỷ được áp dụng thuế suất 17% trong 10 năm đúng không?",
                hits,
                PERIOD,
            )
        self.assertEqual(mock_llm.invoke.call_count, 2)
        self.assertEqual(result["answer_status"], "ANSWERED")
        self.assertIn("Không đúng", result["answer"])

    def test_reversed_cap_polarity_triggers_retry(self):
        # A08 / A09: source states excess over 05 triệu is non-deductible; saying excess is deductible must fail.
        hits = [
            _hit(
                "320/2025/NĐ-CP",
                "Điều 10",
                "Phần chi vượt mức 05 triệu đồng/tháng/người để trích nộp quỹ hưu trí tự nguyện không tính vào chi phí được trừ.",
            )
        ]
        inverted = _answer(
            used_sources=[1],
            conclusion="Phần chi vượt 5 triệu đồng/tháng/người được trừ khi tính thuế TNDN [1].",
        )
        fixed = _answer(
            used_sources=[1],
            conclusion="Khoản chi bảo hiểm hưu trí tự nguyện được trừ tối đa 05 triệu đồng/tháng/người; phần chi vượt mức 05 triệu đồng/tháng/người không tính vào chi phí được trừ [1].",
        )
        with patch("app.modules.rag.generator.llm_model") as mock_llm:
            mock_llm.invoke.side_effect = [_reply(inverted), _reply(fixed)]
            result = GroundedGenerator.generate_answer(
                "Bảo hiểm hưu trí tự nguyện được trừ tối đa bao nhiêu?",
                hits,
                PERIOD,
            )
        self.assertEqual(mock_llm.invoke.call_count, 2)
        self.assertEqual(result["answer_status"], "ANSWERED")
        self.assertIn("không tính vào chi phí được trừ", result["answer"])

    def test_facts_and_legal_basis_use_canonical_question_and_chunk_metadata(self):
        # Ensure LLM assumptions in facts or mismatched clause numbers in legal_basis never leak.
        drifted = _answer(
            used_sources=[3],
            facts="Doanh nghiệp có doanh thu không quá 50 tỷ đồng trong năm 2026.",
            legal_basis="[3] Khoản 1, Khoản 2 Điều 19 Luật 67/2025/QH15.",
            conclusion="Thuế suất phổ thông là 20% [3].",
        )
        result, _ = _generate(drifted)
        self.assertEqual(result["answer_status"], "ANSWERED")
        self.assertNotIn("không quá 50 tỷ", result["answer"])
        self.assertNotIn("Điều 19", result["answer"])
        self.assertIn("Điều 10", result["answer"])

    def test_python_cit_calculator_enforces_exact_tax_payable(self):
        # Task #10 (B03, N04): revenue 2B (<= 3B -> 15%), taxable income 280M -> exact tax is 42M, not 280M.
        hits = [
            _hit(
                "67/2025/QH15",
                "Điều 10",
                "Thuế suất 15% áp dụng đối với doanh nghiệp có tổng doanh thu năm không quá 03 tỷ đồng.",
            )
        ]
        wrong_math = _answer(
            used_sources=[1],
            conclusion="Số thuế TNDN phải nộp là 280 triệu đồng theo thuế suất 15% [1].",
        )
        right_math = _answer(
            used_sources=[1],
            conclusion="Với thu nhập tính thuế 280 triệu đồng và thuế suất 15%, số thuế TNDN phải nộp là 42 triệu đồng [1].",
        )
        with patch("app.modules.rag.generator.llm_model") as mock_llm:
            mock_llm.invoke.side_effect = [_reply(wrong_math), _reply(right_math)]
            result = GroundedGenerator.generate_answer(
                "Doanh thu 2 tỷ, thu nhập tính thuế 280 triệu thì số thuế TNDN phải nộp là bao nhiêu?",
                hits,
                PERIOD,
            )
            first_prompt = mock_llm.invoke.call_args_list[0].args[0]

        self.assertIn("42 triệu đồng", first_prompt)
        self.assertEqual(mock_llm.invoke.call_count, 2)
        self.assertEqual(result["answer_status"], "ANSWERED")
        self.assertIn("42 triệu đồng", result["answer"])

    def test_dropped_eligibility_condition_triggers_retry(self):
        # Task #9 (S02): dropping "từ hộ kinh doanh" from SME 2-year exemption must trigger retry.
        hits = [
            _hit(
                "67/2025/QH15",
                "Điều 15",
                "Doanh nghiệp nhỏ và vừa thành lập mới từ hộ kinh doanh được miễn thuế thu nhập doanh nghiệp trong 02 năm liên tục.",
            )
        ]
        dropped = _answer(
            used_sources=[1],
            conclusion="Doanh nghiệp nhỏ và vừa mới thành lập được miễn thuế TNDN trong 02 năm liên tục [1].",
        )
        preserved = _answer(
            used_sources=[1],
            conclusion="Chỉ doanh nghiệp nhỏ và vừa thành lập mới từ hộ kinh doanh mới được miễn thuế TNDN trong 02 năm liên tục [1].",
        )
        with patch("app.modules.rag.generator.llm_model") as mock_llm:
            mock_llm.invoke.side_effect = [_reply(dropped), _reply(preserved)]
            result = GroundedGenerator.generate_answer(
                "Doanh nghiệp nhỏ và vừa mới thành lập có được miễn thuế TNDN 2 năm không?",
                hits,
                PERIOD,
            )

        self.assertEqual(mock_llm.invoke.call_count, 2)
        self.assertEqual(result["answer_status"], "ANSWERED")
        self.assertIn("từ hộ kinh doanh", result["answer"])

    def test_wrong_rate_from_unused_chunk_is_blocked(self):
        # Task #9 (N15): citing chunk [2] (30% reduction) while writing 20% must fail Step 9.
        wrong_rate = _answer(
            used_sources=[2],
            conclusion="Doanh nghiệp được giảm 20% số thuế TNDN phải nộp [2].",
        )
        right_rate = _answer(
            used_sources=[2],
            conclusion="Doanh nghiệp được giảm 30% số thuế TNDN phải nộp [2].",
        )
        result, calls = _generate(wrong_rate, right_rate)
        self.assertEqual(calls, 2)
        self.assertEqual(result["answer_status"], "ANSWERED")
        self.assertIn("30%", result["answer"])

    def test_missing_revenue_or_sector_in_case_question_returns_need_clarification(self):
        # Task #11 (M1, M2, S03, D7): ask for missing revenue or sector instead of assuming values.
        bracket_hits = [
            _hit(
                "67/2025/QH15",
                "Điều 10",
                "Thuế suất phổ thông là 20%. Doanh nghiệp doanh thu không quá 03 tỷ áp dụng 15%; từ trên 03 tỷ đến 50 tỷ áp dụng 17%.",
            )
        ]
        with patch("app.modules.rag.generator.llm_model") as mock_llm:
            missing_rev = GroundedGenerator.generate_answer(
                "Công ty tôi có thu nhập tính thuế 500 triệu thì số thuế TNDN phải nộp là bao nhiêu?",
                bracket_hits,
                PERIOD,
            )
            missing_sector = GroundedGenerator.generate_answer(
                "Doanh nghiệp có doanh thu 2 tỷ, không xác định được chi phí thì số thuế TNDN phải nộp là bao nhiêu?",
                bracket_hits,
                PERIOD,
            )
            mock_llm.invoke.assert_not_called()

        self.assertEqual(missing_rev["answer_status"], "NEED_CLARIFICATION")
        self.assertIn("doanh thu", missing_rev["answer"].lower())
        self.assertEqual(missing_rev["citations"], [])

        self.assertEqual(missing_sector["answer_status"], "NEED_CLARIFICATION")
        self.assertIn("ngành nghề", missing_sector["answer"].lower())
        self.assertEqual(missing_sector["citations"], [])


class InvestmentIncentiveScopeTests(unittest.TestCase):
    """Spec 3a: investment-project incentives are out of scope; SME incentives stay in scope."""

    def test_investment_project_incentive_is_out_of_scope_without_llm(self):
        question = (
            "Dự án đầu tư mới tại địa bàn có điều kiện kinh tế xã hội đặc biệt khó khăn "
            "được ưu đãi thuế TNDN năm 2026 thế nào?"
        )
        with patch("app.modules.rag.router.llm_model") as mock_llm:
            result = ScopeRouter.analyze(question, "2026")
        mock_llm.invoke.assert_not_called()
        self.assertFalse(result.is_cit)
        self.assertEqual(result.out_of_scope_msg, INVESTMENT_INCENTIVE_OUT_OF_SCOPE_ANSWER)

    def test_sme_incentive_question_still_reaches_llm(self):
        llm_reply = SimpleNamespace(
            content='{"is_cit":true,"period_start":"2026-01-01","period_end":"2026-12-31",'
            '"needs_clarification":false,"clarification_msg":null}'
        )
        with patch("app.modules.rag.router.llm_model") as mock_llm:
            mock_llm.invoke.return_value = llm_reply
            result = ScopeRouter.analyze(
                "Doanh nghiệp được giảm 30% thuế TNDN theo Nghị quyết 43 năm 2026 thế nào?", "2026"
            )
        mock_llm.invoke.assert_called_once()
        self.assertTrue(result.is_cit)
        self.assertIsNone(result.out_of_scope_msg)


if __name__ == "__main__":
    unittest.main()
