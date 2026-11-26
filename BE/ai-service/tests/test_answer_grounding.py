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
        "facts": "Người dùng hỏi thuế suất TNDN phổ thông kỳ 2026.",
        "legal_basis": "[3] Điều 10 Luật 67/2025/QH15 quy định thuế suất 20%.",
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
            _answer(used_sources=[], legal_basis="Theo quy định chung.", conclusion="Là 20%.")
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
                legal_basis="Luật 67/2025/QH15 và Nghị định 398/2026/NĐ-CP.",
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
        fabricated = _answer(legal_basis="[3] Nghị định 15/2026/NĐ-CP quy định thuế suất 20%.")
        result, calls = _generate(fabricated, _answer())
        self.assertEqual(calls, 2)
        self.assertEqual(result["answer_status"], "ANSWERED")
        self.assertNotIn("15/2026", result["answer"])

    def test_fabricated_document_twice_is_rejected(self):
        fabricated = _answer(legal_basis="[3] Nghị định 39/2026/NĐ-CP quy định thuế suất 20%.")
        result, calls = _generate(fabricated, fabricated)
        self.assertEqual(calls, 2)
        self.assertEqual(result["answer_status"], "REJECTED")
        self.assertEqual(result["citations"], [])

    def test_document_mentioned_inside_used_source_text_is_allowed(self):
        result, calls = _generate(
            _answer(
                used_sources=[2],
                legal_basis="[2] Nghị định 398/2026/NĐ-CP hướng dẫn Nghị quyết 43/2026/QH16.",
                conclusion="Doanh nghiệp được giảm 30% [2].",
            )
        )
        self.assertEqual(calls, 1)
        self.assertEqual(result["answer_status"], "ANSWERED")

    def test_document_from_unused_source_is_not_allowed(self):
        unused_doc = _answer(legal_basis="[3] Luật 67/2025/QH15, Thông tư 20/2026/TT-BTC.")
        result, calls = _generate(unused_doc, unused_doc)
        self.assertEqual(calls, 2)
        self.assertEqual(result["answer_status"], "REJECTED")

    def test_extract_document_numbers_ignores_dates(self):
        self.assertEqual(
            extract_document_numbers("Nghị định số 320/2025/NĐ-CP ngày 15/12/2025 và Nghị quyết 43/2026"),
            {"320/2025", "43/2026"},
        )


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
