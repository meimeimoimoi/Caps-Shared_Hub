from datetime import date
from pathlib import Path
import sys
from types import SimpleNamespace
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

AI_SERVICE_ROOT = Path(__file__).resolve().parents[1]
if str(AI_SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(AI_SERVICE_ROOT))

from app.config import settings  # noqa: E402
from app.main import app  # noqa: E402
from app.modules.rag.router import ScopeRouter, parse_tax_period  # noqa: E402


class ScopeRouterTests(unittest.TestCase):
    """Unit tests for deterministic tax-period parsing and ScopeRouter fallback behavior."""

    def test_parse_tax_period_valid_formats(self):
        cases = [
            ("2025", (date(2025, 1, 1), date(2025, 12, 31))),
            ("năm 2025", (date(2025, 1, 1), date(2025, 12, 31))),
            ("2025-01-01..2025-12-31", (date(2025, 1, 1), date(2025, 12, 31))),
            ("2025-05-15", (date(2025, 5, 15), date(2025, 5, 15))),
            ("Q2/2025", (date(2025, 4, 1), date(2025, 6, 30))),
            ("2025-Q4", (date(2025, 10, 1), date(2025, 12, 31))),
            ("quý 3 năm 2025", (date(2025, 7, 1), date(2025, 9, 30))),
            ("02/2024", (date(2024, 2, 1), date(2024, 2, 29))),
            ("tháng 3 năm 2025", (date(2025, 3, 1), date(2025, 3, 31))),
        ]
        for raw, expected in cases:
            with self.subTest(raw=raw):
                self.assertEqual(parse_tax_period(raw), expected)

    def test_parse_tax_period_invalid_formats_return_none(self):
        for raw in (
            None,
            "",
            "   ",
            "2025-12-31..2025-01-01",
            "2025-02-30",
            "Q5/2025",
            "13/2025",
            "năm nay",
        ):
            with self.subTest(raw=raw):
                self.assertIsNone(parse_tax_period(raw))

    def test_explicit_user_tax_period_resolves_clarification(self):
        llm_reply = SimpleNamespace(
            content='{"is_cit":true,"period_start":null,"period_end":null,"needs_clarification":true,"clarification_msg":null}'
        )
        with patch("app.modules.rag.router.llm_model") as mock_llm:
            mock_llm.invoke.return_value = llm_reply
            result = ScopeRouter.analyze(
                "Thuế suất thuế thu nhập doanh nghiệp phổ thông năm 2025 là bao nhiêu?",
                "2025",
            )

        self.assertTrue(result.is_cit)
        self.assertFalse(result.needs_clarification)
        self.assertEqual(result.period_start, date(2025, 1, 1))
        self.assertEqual(result.period_end, date(2025, 12, 31))
        self.assertIsNone(result.clarification_msg)

    def test_question_year_fallback_resolves_when_user_period_absent(self):
        llm_reply = SimpleNamespace(
            content='{"is_cit":true,"period_start":null,"period_end":null,"needs_clarification":true,"clarification_msg":null}'
        )
        with patch("app.modules.rag.router.llm_model") as mock_llm:
            mock_llm.invoke.return_value = llm_reply
            result = ScopeRouter.analyze(
                "Thuế suất thuế thu nhập doanh nghiệp phổ thông năm 2025 là bao nhiêu?",
                None,
            )

        self.assertFalse(result.needs_clarification)
        self.assertEqual(result.period_start, date(2025, 1, 1))
        self.assertEqual(result.period_end, date(2025, 12, 31))

    def test_multiple_years_in_question_keeps_clarification(self):
        llm_reply = SimpleNamespace(
            content='{"is_cit":true,"period_start":null,"period_end":null,"needs_clarification":true,"clarification_msg":"Bạn hỏi cho năm 2024 hay năm 2025?"}'
        )
        with patch("app.modules.rag.router.llm_model") as mock_llm:
            mock_llm.invoke.return_value = llm_reply
            result = ScopeRouter.analyze(
                "So sánh thuế suất TNDN năm 2024 và năm 2025?",
                None,
            )

        self.assertTrue(result.needs_clarification)
        self.assertIsNone(result.period_start)
        self.assertIsNone(result.period_end)

    def test_legal_citation_number_is_not_treated_as_tax_period(self):
        llm_reply = SimpleNamespace(
            content='{"is_cit":true,"period_start":null,"period_end":null,"needs_clarification":true,"clarification_msg":null}'
        )
        with patch("app.modules.rag.router.llm_model") as mock_llm:
            mock_llm.invoke.return_value = llm_reply
            result = ScopeRouter.analyze(
                "Theo Nghị định 320/2025/NĐ-CP chi phí quảng cáo có bị khống chế không?",
                None,
            )

        self.assertTrue(result.needs_clarification)
        self.assertIsNone(result.period_start)

    def test_out_of_scope_is_preserved_even_with_user_tax_period(self):
        llm_reply = SimpleNamespace(
            content='{"is_cit":false,"period_start":null,"period_end":null,"needs_clarification":false,"clarification_msg":null}'
        )
        with patch("app.modules.rag.router.llm_model") as mock_llm:
            mock_llm.invoke.return_value = llm_reply
            result = ScopeRouter.analyze("Thuế TNCN năm 2025 tính sao?", "2025")

        self.assertFalse(result.is_cit)

    def test_chat_endpoint_proceeds_when_year_given(self):
        orig_key = settings.INTERNAL_API_KEY
        settings.INTERNAL_API_KEY = ""
        llm_reply = SimpleNamespace(
            content='{"is_cit":true,"period_start":null,"period_end":null,"needs_clarification":true,"clarification_msg":null}'
        )
        try:
            with (
                patch("app.main.init_qdrant"),
                patch("app.modules.rag.router.llm_model") as mock_llm,
                patch("app.api.routes.TemporalRetriever.retrieve", return_value=[]),
            ):
                mock_llm.invoke.return_value = llm_reply
                client = TestClient(app)
                resp = client.post(
                    "/api/v1/chat/query",
                    json={
                        "question": "Thuế suất thuế thu nhập doanh nghiệp phổ thông năm 2025 là bao nhiêu?",
                        "user_tax_period": "2025",
                    },
                )
        finally:
            settings.INTERNAL_API_KEY = orig_key

        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertEqual(body["scope_result"], "IN_SCOPE")
        self.assertEqual(body["period_start"], "2025-01-01")
        self.assertEqual(body["period_end"], "2025-12-31")
        self.assertEqual(body["answer_status"], "REJECTED")


if __name__ == "__main__":
    unittest.main()
