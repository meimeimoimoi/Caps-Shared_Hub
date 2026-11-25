import json
from pathlib import Path
import sys
from types import SimpleNamespace
import unittest
from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient
from qdrant_client.models import Filter

AI_SERVICE_ROOT = Path(__file__).resolve().parents[1]
if str(AI_SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(AI_SERVICE_ROOT))

from app.config import settings  # noqa: E402
from app.main import app  # noqa: E402
from app.modules.rag.generator import GroundedGenerator  # noqa: E402
from app.modules.rag.retriever import TemporalRetriever  # noqa: E402


def _sample_hit():
    return SimpleNamespace(
        payload={
            "legal_source_id": "src-67-2025",
            "document_number": "67/2025/QH15",
            "document_title": "Luật Thuế thu nhập doanh nghiệp",
            "article": "Điều 10",
            "clause": "Khoản 1",
            "point": None,
            "effective_from": "2025-10-01T00:00:00Z",
            "effective_to": None,
            "text_content": "Thuế suất thuế thu nhập doanh nghiệp là 20%, trừ trường hợp ưu đãi.",
        }
    )


class RagGeneratorAndRetrieverTests(unittest.TestCase):
    """Unit tests for 3-part grounded answers, nested Qdrant temporal filters, and ingest date validation."""

    def setUp(self):
        self._orig_key = settings.INTERNAL_API_KEY
        settings.INTERNAL_API_KEY = ""
        self._qdrant_patch = patch("app.main.init_qdrant")
        self._qdrant_patch.start()
        self.client = TestClient(app)

    def tearDown(self):
        settings.INTERNAL_API_KEY = self._orig_key
        self._qdrant_patch.stop()

    def test_grounded_generator_formats_structured_json_into_three_sections(self):
        llm_reply = SimpleNamespace(
            content=json.dumps(
                {
                    "facts": "Người dùng hỏi mức thuế suất thuế TNDN phổ thông áp dụng cho kỳ tính thuế 2026.",
                    "legal_basis": "[1] Khoản 1 Điều 10 Luật Thuế thu nhập doanh nghiệp số 67/2025/QH15 quy định thuế suất 20%.",
                    "conclusion": "Mức thuế suất thuế TNDN phổ thông áp dụng cho kỳ tính thuế 2026 là 20% [1].",
                },
                ensure_ascii=False,
            )
        )
        with patch("app.modules.rag.generator.llm_model") as mock_llm:
            mock_llm.invoke.return_value = llm_reply
            result = GroundedGenerator.generate_answer(
                "Thuế suất thuế TNDN phổ thông là bao nhiêu phần trăm?",
                [_sample_hit()],
                "2026-01-01 đến 2026-12-31",
            )

        self.assertEqual(result["answer_status"], "ANSWERED")
        answer = result["answer"]
        pos_facts = answer.find("Dữ kiện:")
        pos_basis = answer.find("Căn cứ:")
        pos_conclusion = answer.find("Kết luận:")
        self.assertTrue(0 <= pos_facts < pos_basis < pos_conclusion, answer)
        self.assertIn("67/2025/QH15", answer)
        self.assertEqual(len(result["citations"]), 1)
        self.assertEqual(result["citations"][0]["document_number"], "67/2025/QH15")

    def test_grounded_generator_falls_back_to_three_sections_on_plain_text(self):
        llm_reply = SimpleNamespace(
            content="Thuế suất thuế TNDN phổ thông là 20% [1]."
        )
        with patch("app.modules.rag.generator.llm_model") as mock_llm:
            mock_llm.invoke.return_value = llm_reply
            result = GroundedGenerator.generate_answer(
                "Thuế suất thuế TNDN phổ thông là bao nhiêu phần trăm?",
                [_sample_hit()],
                "2026-01-01 đến 2026-12-31",
            )

        self.assertEqual(result["answer_status"], "ANSWERED")
        answer = result["answer"]
        pos_facts = answer.find("Dữ kiện:")
        pos_basis = answer.find("Căn cứ:")
        pos_conclusion = answer.find("Kết luận:")
        self.assertTrue(0 <= pos_facts < pos_basis < pos_conclusion, answer)
        self.assertIn("67/2025/QH15", answer)
        self.assertIn("20% [1]", answer)

    def test_temporal_retriever_nests_effective_to_should_clause_inside_must(self):
        fake_qdrant = MagicMock()
        del fake_qdrant.search
        fake_qdrant.query_points.return_value = SimpleNamespace(points=[])

        with (
            patch("app.modules.rag.retriever.embedding_model") as mock_embed,
            patch("app.modules.rag.retriever.qdrant_client", fake_qdrant),
        ):
            mock_embed.embed_query.return_value = [0.1, 0.2]
            TemporalRetriever.retrieve("Thuế suất TNDN", "2026-01-01", "2026-12-31")

        query_filter = fake_qdrant.query_points.call_args.kwargs["query_filter"]
        self.assertIsNone(query_filter.should)
        self.assertEqual(len(query_filter.must), 3)
        nested_filter = query_filter.must[2]
        self.assertIsInstance(nested_filter, Filter)
        self.assertEqual(len(nested_filter.should), 3)

    def test_chunk_and_embed_rejects_missing_or_invalid_effective_from(self):
        missing_resp = self.client.post(
            "/api/v1/kb/chunk-and-embed",
            json={
                "knowledge_document_id": "doc-1",
                "legal_source_id": "src-1",
                "document_number": "113/VBHN-VPQH",
                "title": "Văn bản hợp nhất Luật Thuế TNDN",
                "effective_from": None,
                "vbhn_effective_from": None,
                "chunks": [
                    {
                        "chunk_index": 0,
                        "article": "Điều 10",
                        "clause": "Khoản 1",
                        "point": None,
                        "path": None,
                        "text": "Thuế suất phổ thông là 20%.",
                    }
                ],
            },
        )
        self.assertEqual(missing_resp.status_code, 400)

        invalid_resp = self.client.post(
            "/api/v1/kb/chunk-and-embed",
            json={
                "knowledge_document_id": "doc-1",
                "legal_source_id": "src-1",
                "document_number": "67/2025/QH15",
                "title": "Luật Thuế TNDN",
                "effective_from": "01-10-2025",
                "chunks": [
                    {
                        "chunk_index": 0,
                        "article": "Điều 10",
                        "clause": "Khoản 1",
                        "point": None,
                        "path": None,
                        "text": "Thuế suất phổ thông là 20%.",
                    }
                ],
            },
        )
        self.assertEqual(invalid_resp.status_code, 400)


if __name__ == "__main__":
    unittest.main()
