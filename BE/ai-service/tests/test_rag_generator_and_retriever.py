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
from app.modules.ingestion.chunker import LegalChunker  # noqa: E402
from app.modules.rag.generator import GroundedGenerator  # noqa: E402
from app.modules.rag.retriever import TemporalRetriever, _prepare_search_query  # noqa: E402


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

    def test_temporal_retriever_reranks_cit_deductibility_chunk_above_admin_penalty_chunk(self):
        admin_hit = SimpleNamespace(
            score=0.62,
            payload={
                "document_number": "252/2026/NĐ-CP",
                "article": "Điều 45",
                "clause": "Khoản 1",
                "point": None,
                "text_content": "Thủ tục xử phạt vi phạm hành chính về quản lý thuế và cưỡng chế tiền phạt.",
            },
        )
        cit_hit = SimpleNamespace(
            score=0.56,
            payload={
                "document_number": "320/2025/NĐ-CP",
                "article": "Điều 10",
                "clause": "Khoản 2",
                "point": None,
                "text_content": "Các khoản chi không được trừ khi xác định thu nhập chịu thuế bao gồm các khoản tiền phạt về vi phạm hành chính.",
            },
        )
        fake_qdrant = MagicMock()
        del fake_qdrant.search
        fake_qdrant.query_points.return_value = SimpleNamespace(points=[admin_hit, cit_hit])

        with (
            patch("app.modules.rag.retriever.embedding_model") as mock_embed,
            patch("app.modules.rag.retriever.qdrant_client", fake_qdrant),
        ):
            mock_embed.embed_query.return_value = [0.1, 0.2]
            ranked = TemporalRetriever.retrieve(
                "Tiền phạt vi phạm hành chính có được trừ khi tính thuế TNDN không?",
                "2026-01-01",
                "2026-12-31",
                limit=2,
            )

        self.assertEqual(ranked[0].payload["document_number"], "320/2025/NĐ-CP")

    def test_legal_chunker_preserves_points_subpoints_and_infers_amending_clauses(self):
        # Task #14: keep individual point/sub-point labels (a, đ1, đ2) and infer clauses in amending laws.
        doc = {
            "knowledge_document_id": "doc-320",
            "legal_source_id": "src-320",
            "document_number": "320/2025/NĐ-CP",
            "title": "Nghị định 320",
            "effective_from": "2025-12-15",
            "effective_to": None,
            "content_json": {
                "chapters": [
                    {
                        "number": "II",
                        "title": "Căn cứ tính thuế",
                        "articles": [
                            {
                                "number": "10",
                                "title": "Các khoản chi không được trừ",
                                "units": [
                                    {"clause": "4", "point": None, "text": "Các khoản chi vượt định mức:"},
                                    {"clause": "4", "point": "a", "text": "Chi khấu hao vượt mức quy định."},
                                    {
                                        "clause": "4",
                                        "point": "đ",
                                        "text": "Chi hưu trí tự nguyện:\nđ1) Phần vượt 05 triệu đồng/tháng/người;\nđ2) Không ghi cụ thể điều kiện hưởng trong hợp đồng.",
                                    },
                                ],
                            },
                            {
                                "number": "1",
                                "title": "Sửa đổi, bổ sung một số điều",
                                "units": [
                                    {
                                        "clause": None,
                                        "point": None,
                                        "text": "1. Sửa đổi khoản 2 Điều 10 như sau: Thuế suất 15%.\n2. Bổ sung khoản 5 Điều 12 như sau: Kê khai theo quý.",
                                    }
                                ],
                            },
                        ],
                    }
                ]
            },
        }
        chunks = LegalChunker.chunk_document(doc)
        art10_chunks = [c for c in chunks if c["article"] == "Điều 10"]
        self.assertEqual(
            [c["point"] for c in art10_chunks],
            ["Điểm a", "Điểm đ1", "Điểm đ2"],
        )
        self.assertTrue(all(c["clause"] == "Khoản 4" for c in art10_chunks))

        art1_chunks = [c for c in chunks if c["article"] == "Điều 1"]
        self.assertEqual(
            [c["clause"] for c in art1_chunks],
            ["Khoản 1", "Khoản 2"],
        )

    def test_prepare_search_query_strips_true_false_noise_and_expands_unaccented_cit(self):
        # Task #12 (E04, E06, F01, F02): strip "đúng không?" noise and expand unaccented Vietnamese keywords.
        cleaned_tf = _prepare_search_query("Chuyển lỗ 7 năm có đúng không?")
        self.assertNotIn("đúng không", cleaned_tf.lower())
        self.assertIn("Chuyển lỗ 7 năm", cleaned_tf)

        expanded_ascii = _prepare_search_query("chi phi khau hao o to duoc tru bao nhieu?")
        self.assertIn("khấu hao", expanded_ascii)
        self.assertIn("khoản chi được trừ", expanded_ascii)

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
