"""Approve -> chunk -> index -> retrieve, end to end inside ai-service.

Runs the real chunker, indexer, Qdrant (in-memory local mode) and temporal retriever; only the Ollama
embedding model is faked. The request body has the shape ingestion (.NET) sends on approve, with
content_json as the crawler parser writes it.
"""

from pathlib import Path
import sys
import unittest
from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient
from qdrant_client import QdrantClient

AI_SERVICE_ROOT = Path(__file__).resolve().parents[1]
if str(AI_SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(AI_SERVICE_ROOT))

from app.config import settings  # noqa: E402
from app.core.qdrant import init_qdrant  # noqa: E402
from app.main import app  # noqa: E402
from app.modules.rag.retriever import TemporalRetriever  # noqa: E402

DOC_ID = "0194f3a2-0000-7000-8000-000000000001"

# Same direction for every text, so similarity is 1.0 and only the payload filters decide what is found.
VECTOR = [1.0] + [0.0] * 1023


def unit(article: str, i: int, clause: str | None, text: str) -> dict:
    # Shape of crawler legal_parser.to_content_json; "reviewed" is the flag ingestion adds on review.
    return {
        "id": f"d{article}-{i}",
        "label": f"Khoản {clause}" if clause else "Mở đầu",
        "clause": clause,
        "point": None,
        "text": text,
        "status": "AUTO",
        "reviewed": True,
    }


APPROVE_REQUEST = {
    "knowledge_document_id": DOC_ID,
    "legal_source_id": "0194f3a2-0000-7000-8000-0000000000aa",
    "document_number": "67/2025/QH15",
    "title": "Luật Thuế thu nhập doanh nghiệp",
    "doc_type": "Luật",
    "effective_from": "2025-10-01",
    "effective_to": None,
    "vbhn_effective_from": None,
    "chunks": None,
    "content_json": {
        "parse_status": "OK",
        "preamble": "",
        "chapters": [
            {
                "number": "II",
                "title": "Căn cứ và phương pháp tính thuế",
                "part": None,
                "articles": [
                    {
                        "number": "10",
                        "title": "Thuế suất",
                        "section": None,
                        "units": [
                            unit("10", 0, None, "Thuế suất thuế thu nhập doanh nghiệp như sau:"),
                            unit("10", 1, "1", "Thuế suất phổ thông là 20%."),
                            unit("10", 2, "2", "Doanh nghiệp có doanh thu dưới 3 tỷ đồng áp dụng 15%."),
                        ],
                    },
                    {
                        "number": "11",
                        "title": "Phương pháp tính thuế",
                        "section": None,
                        "units": [unit("11", 0, None, "Thuế phải nộp bằng thu nhập tính thuế nhân thuế suất.")],
                    },
                ],
            }
        ],
        "closing": "",
        "appendices": [],
        "warnings": [],
    },
}


class KbApproveEndToEndTests(unittest.TestCase):
    def setUp(self):
        self._orig_internal_key = settings.INTERNAL_API_KEY
        settings.INTERNAL_API_KEY = ""
        self.qdrant = QdrantClient(":memory:")
        embedder = MagicMock()
        embedder.embed_documents.side_effect = lambda texts: [VECTOR for _ in texts]
        embedder.embed_query.return_value = VECTOR
        self._patches = [
            patch("app.main.init_qdrant"),
            patch("app.core.qdrant.qdrant_client", self.qdrant),
            patch("app.modules.ingestion.indexer.qdrant_client", self.qdrant),
            patch("app.modules.rag.retriever.qdrant_client", self.qdrant),
            patch("app.modules.ingestion.indexer.embedding_model", embedder),
            patch("app.modules.rag.retriever.embedding_model", embedder),
        ]
        for p in self._patches:
            p.start()
        init_qdrant()
        self.client = TestClient(app)

    def tearDown(self):
        for p in reversed(self._patches):
            p.stop()
        settings.INTERNAL_API_KEY = self._orig_internal_key

    def approve(self) -> dict:
        resp = self.client.post("/api/v1/kb/chunk-and-embed", json=APPROVE_REQUEST)
        self.assertEqual(resp.status_code, 200, resp.text)
        return resp.json()

    def found(self, period_start: str = "2026-01-01", period_end: str = "2026-12-31") -> list:
        return [
            p
            for p in TemporalRetriever.retrieve("thuế suất", period_start, period_end, limit=50)
            if p.payload["knowledge_document_id"] == DOC_ID
        ]

    def stored_points(self) -> int:
        return self.qdrant.count(settings.QDRANT_COLLECTION, exact=True).count

    def test_approved_document_is_chunked_indexed_and_retrievable(self):
        body = self.approve()

        # Article 10: intro + clause 1 + clause 2; article 11: one unit.
        self.assertEqual(body["total_chunks"], 4)
        self.assertEqual(
            [(c["article"], c["clause"]) for c in body["kb_chunks"]],
            [("Điều 10", None), ("Điều 10", "Khoản 1"), ("Điều 10", "Khoản 2"), ("Điều 11", None)],
        )

        points = self.found()
        self.assertEqual(
            {str(p.id) for p in points}, {c["qdrant_point_id"] for c in body["kb_chunks"]}
        )
        clause_1 = next(p.payload for p in points if p.payload["clause"] == "Khoản 1")
        self.assertEqual(clause_1["status"], "APPROVED")
        self.assertEqual(clause_1["effective_from"], "2025-10-01T00:00:00Z")
        self.assertIn("Điều 10. Thuế suất", clause_1["text_content"])
        self.assertIn("Thuế suất phổ thông là 20%.", clause_1["text_content"])

    def test_document_is_not_retrieved_for_a_period_before_it_takes_effect(self):
        self.approve()

        self.assertEqual(self.found("2024-01-01", "2024-12-31"), [])

    def test_indexing_again_replaces_the_points_instead_of_adding_more(self):
        first = self.approve()
        second = self.approve()

        self.assertEqual(self.stored_points(), 4)
        self.assertEqual(
            {str(p.id) for p in self.found()}, {c["qdrant_point_id"] for c in second["kb_chunks"]}
        )
        self.assertNotEqual(first["kb_chunks"][0]["qdrant_point_id"], second["kb_chunks"][0]["qdrant_point_id"])

    def test_retired_document_drops_out_of_retrieval_and_delete_removes_it(self):
        self.approve()

        resp = self.client.patch(
            f"/api/v1/kb/documents/{DOC_ID}/metadata", json={"status": "ARCHIVED"}
        )
        self.assertEqual(resp.status_code, 200, resp.text)
        self.assertEqual(resp.json()["matched_count"], 4)
        self.assertEqual(self.found(), [])

        resp = self.client.delete(f"/api/v1/kb/documents/{DOC_ID}")
        self.assertEqual(resp.json()["deleted_count"], 4)
        self.assertEqual(self.stored_points(), 0)


if __name__ == "__main__":
    unittest.main()
