import json
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
from app.modules.drafting.drafter import build_draft_retrieval_query  # noqa: E402


def _make_hit(
    *,
    doc_number: str | None = "320/2025/ND-CP",
    source_id: str | None = "src-1",
    doc_title: str | None = "Nghị định 320/2025/NĐ-CP",
    article: str | None = "Điều 11",
    clause: str | None = "Khoản 1",
    point: str | None = None,
    effective_from: str | None = "2025-01-01",
    effective_to: str | None = None,
    text_content: str = "Thuế suất thuế thu nhập doanh nghiệp là 20%.",
):
    return SimpleNamespace(
        payload={
            "legal_source_id": source_id,
            "document_number": doc_number,
            "document_title": doc_title,
            "article": article,
            "clause": clause,
            "point": point,
            "effective_from": effective_from,
            "effective_to": effective_to,
            "text_content": text_content,
        }
    )


class DraftingGroundingTests(unittest.TestCase):
    """Unit tests for BR-D12 grounding issues, unauthorized numbers, and citation checks."""

    def setUp(self):
        self._orig_key = settings.INTERNAL_API_KEY
        settings.INTERNAL_API_KEY = ""
        self._qdrant_patch = patch("app.main.init_qdrant")
        self._qdrant_patch.start()
        self.client = TestClient(app)

    def tearDown(self):
        settings.INTERNAL_API_KEY = self._orig_key
        self._qdrant_patch.stop()

    def test_empty_retrieval_returns_blocking_grounding_issue_and_flags_fabricated_law(self):
        llm_reply = SimpleNamespace(
            content=json.dumps(
                {
                    "summary": "Căn cứ Điều 9 Nghị định 99/2025/NĐ-CP, doanh thu là 1000.",
                },
                ensure_ascii=False,
            )
        )
        with (
            patch("app.api.routes.TemporalRetriever.retrieve", return_value=[]),
            patch("app.modules.drafting.drafter.llm_model") as mock_llm,
        ):
            mock_llm.invoke.return_value = llm_reply
            resp = self.client.post(
                "/api/v1/drafting/generate",
                json={
                    "document_id": "doc-1",
                    "snapshot_data": {"revenue": 1000},
                    "template_schema": [{"id": "summary", "label": "Tóm tắt", "required": True}],
                    "period_start": "2026-01-01",
                    "period_end": "2026-12-31",
                },
            )

        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertTrue(body["has_grounding_issues"])
        codes = {issue["code"]: issue for issue in body["issues"]}
        self.assertIn("MISSING_LEGAL_BASIS", codes)
        self.assertEqual(codes["MISSING_LEGAL_BASIS"]["type"], "GROUNDING_ISSUE")
        self.assertEqual(codes["MISSING_LEGAL_BASIS"]["severity"], "BLOCKING")
        self.assertIn("FABRICATED_LEGAL_BASIS", codes)
        self.assertEqual(codes["FABRICATED_LEGAL_BASIS"]["severity"], "BLOCKING")

    def test_valid_retrieval_and_snapshot_numbers_produce_no_issues(self):
        llm_reply = SimpleNamespace(
            content=json.dumps(
                {
                    "revenue": "1000",
                    "legal_basis": "Theo Điều 11 Nghị định 320/2025/ND-CP.",
                },
                ensure_ascii=False,
            )
        )
        with (
            patch("app.api.routes.TemporalRetriever.retrieve", return_value=[_make_hit()]),
            patch("app.modules.drafting.drafter.llm_model") as mock_llm,
        ):
            mock_llm.invoke.return_value = llm_reply
            resp = self.client.post(
                "/api/v1/drafting/generate",
                json={
                    "document_id": "doc-2",
                    "snapshot_data": {"revenue": 1000},
                    "template_schema": [
                        {"id": "revenue", "label": "Doanh thu", "required": True},
                        {"id": "legal_basis", "label": "Căn cứ pháp lý", "required": True},
                    ],
                    "period_start": "2026-01-01",
                    "period_end": "2026-12-31",
                },
            )

        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertFalse(body["has_grounding_issues"])
        self.assertFalse(body["has_unauthorized_numbers"])
        self.assertEqual(body["issues"], [])

    def test_required_legal_section_missing_content_emits_blocking_grounding_issue(self):
        llm_reply = SimpleNamespace(
            content=json.dumps(
                {
                    "revenue": "1000",
                    "legal_basis": "",
                },
                ensure_ascii=False,
            )
        )
        with (
            patch("app.api.routes.TemporalRetriever.retrieve", return_value=[_make_hit()]),
            patch("app.modules.drafting.drafter.llm_model") as mock_llm,
        ):
            mock_llm.invoke.return_value = llm_reply
            resp = self.client.post(
                "/api/v1/drafting/generate",
                json={
                    "document_id": "doc-3",
                    "snapshot_data": {"revenue": 1000},
                    "template_schema": [
                        {"id": "revenue", "label": "Doanh thu", "required": True},
                        {"id": "legal_basis", "label": "Căn cứ pháp lý", "required": True},
                    ],
                    "period_start": "2026-01-01",
                    "period_end": "2026-12-31",
                },
            )

        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertTrue(body["has_grounding_issues"])
        issue = next(i for i in body["issues"] if i["code"] == "UNGROUNDED_LEGAL_SECTION")
        self.assertEqual(issue["severity"], "BLOCKING")
        self.assertEqual(issue["field_id"], "legal_basis")

    def test_unauthorized_numbers_and_citation_traceability_issues(self):
        llm_reply = SimpleNamespace(
            content=json.dumps(
                {"revenue": "1000", "tax_payable": "999999"},
                ensure_ascii=False,
            )
        )
        untraceable_hit = _make_hit(doc_number=None, source_id=None, article=None, effective_from=None)
        with (
            patch("app.api.routes.TemporalRetriever.retrieve", return_value=[untraceable_hit]),
            patch("app.modules.drafting.drafter.llm_model") as mock_llm,
        ):
            mock_llm.invoke.return_value = llm_reply
            resp = self.client.post(
                "/api/v1/drafting/generate",
                json={
                    "document_id": "doc-4",
                    "snapshot_data": {"revenue": 1000},
                    "template_schema": {"fields": []},
                    "period_start": "2026-01-01",
                    "period_end": "2026-12-31",
                },
            )

        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertTrue(body["has_unauthorized_numbers"])
        self.assertIn("999999", body["unauthorized_numbers"])
        codes = {i["code"]: i for i in body["issues"]}
        self.assertEqual(codes["UNAUTHORIZED_NUMBERS"]["severity"], "BLOCKING")
        self.assertEqual(codes["UNTRACEABLE_REQUIRED_CITATION"]["severity"], "BLOCKING")

    def test_partial_citation_metadata_emits_warning_issue(self):
        llm_reply = SimpleNamespace(
            content=json.dumps({"revenue": "1000"}, ensure_ascii=False)
        )
        partial_hit = _make_hit(article=None, clause=None, point=None, effective_from=None)
        with (
            patch("app.api.routes.TemporalRetriever.retrieve", return_value=[partial_hit]),
            patch("app.modules.drafting.drafter.llm_model") as mock_llm,
        ):
            mock_llm.invoke.return_value = llm_reply
            resp = self.client.post(
                "/api/v1/drafting/generate",
                json={
                    "document_id": "doc-5",
                    "snapshot_data": {"revenue": 1000},
                    "template_schema": [{"id": "revenue", "required": True}],
                    "period_start": "2026-01-01",
                    "period_end": "2026-12-31",
                },
            )

        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertFalse(body["has_grounding_issues"])
        self.assertEqual(len(body["issues"]), 1)
        self.assertEqual(body["issues"][0]["code"], "INCOMPLETE_CITATION_METADATA")
        self.assertEqual(body["issues"][0]["severity"], "WARNING")

    def test_empty_retrieval_synthesizes_narrative_when_llm_echoes_snapshot_only(self):
        llm_reply = SimpleNamespace(
            content=json.dumps(
                {"companyName": "Công ty Minh An", "revenue": 1000},
                ensure_ascii=False,
            )
        )
        with (
            patch("app.api.routes.TemporalRetriever.retrieve", return_value=[]),
            patch("app.modules.drafting.drafter.llm_model") as mock_llm,
        ):
            mock_llm.invoke.return_value = llm_reply
            resp = self.client.post(
                "/api/v1/drafting/generate",
                json={
                    "document_id": "doc-6",
                    "snapshot_data": {"companyName": "Công ty Minh An", "revenue": 1000},
                    "template_schema": [
                        {"id": "companyName", "label": "Tên doanh nghiệp", "required": True},
                        {"id": "revenue", "label": "Doanh thu", "required": True},
                    ],
                    "period_start": "2026-01-01",
                    "period_end": "2026-12-31",
                },
            )

        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertEqual(body["content"]["companyName"], "Công ty Minh An")
        self.assertEqual(body["content"]["revenue"], 1000)
        self.assertIn("noi_dung_giai_trinh", body["content"])
        self.assertIn("Tên doanh nghiệp: Công ty Minh An", body["content"]["noi_dung_giai_trinh"])
        self.assertIn("Chưa có căn cứ pháp lý đã được phê duyệt", body["content"]["can_cu_phap_ly"])
        self.assertFalse(body["has_unauthorized_numbers"])
        codes = {i["code"] for i in body["issues"]}
        self.assertIn("MISSING_LEGAL_BASIS", codes)
        self.assertNotIn("FABRICATED_LEGAL_BASIS", codes)

    def test_build_draft_retrieval_query_combines_labels_and_descriptive_values(self):
        query = build_draft_retrieval_query(
            {"companyName": "Công ty Minh An", "taxCode": "0123456789", "revenue": 1000},
            [{"id": "expenseDescription", "label": "Chi phí khấu hao tài sản cố định"}],
        )
        self.assertIn("Chi phí khấu hao tài sản cố định", query)
        self.assertIn("Công ty Minh An", query)
        self.assertNotIn("0123456789", query)

    def test_thousand_separator_formatting_of_snapshot_numbers_is_authorized(self):
        llm_reply = SimpleNamespace(
            content=json.dumps(
                {
                    "deductibleAmount": "160000000",
                    "noi_dung_giai_trinh": "Khoản chi đề nghị được trừ là 160,000,000 VND (tức 160.000.000 đồng) phát sinh ngày 15 tháng 3 năm 2026.",
                    "can_cu_phap_ly": "Theo Điều 11 Nghị định 320/2025/ND-CP.",
                },
                ensure_ascii=False,
            )
        )
        with (
            patch("app.api.routes.TemporalRetriever.retrieve", return_value=[_make_hit()]),
            patch("app.modules.drafting.drafter.llm_model") as mock_llm,
        ):
            mock_llm.invoke.return_value = llm_reply
            resp = self.client.post(
                "/api/v1/drafting/generate",
                json={
                    "document_id": "doc-7",
                    "snapshot_data": {
                        "deductibleAmount": "160000000",
                        "transactionDate": "2026-03-15",
                    },
                    "template_schema": [
                        {"id": "deductibleAmount", "label": "Số tiền đề nghị được trừ", "required": True},
                    ],
                    "period_start": "2026-01-01",
                    "period_end": "2026-12-31",
                },
            )

        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertFalse(body["has_unauthorized_numbers"], body["unauthorized_numbers"])
        self.assertEqual(body["issues"], [])


if __name__ == "__main__":
    unittest.main()
