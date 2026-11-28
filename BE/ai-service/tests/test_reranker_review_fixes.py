"""Fixes for the 28/11 review of the hybrid reranker branch: failed model load, sibling clauses, CPU threads."""

from pathlib import Path
import sys
from types import SimpleNamespace
import unittest
from unittest.mock import MagicMock, patch

AI_SERVICE_ROOT = Path(__file__).resolve().parents[1]
if str(AI_SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(AI_SERVICE_ROOT))

from app.config import settings  # noqa: E402
from app.modules.rag.retriever import (  # noqa: E402
    DRAFT_RETRIEVAL_LIMIT,
    _CrossEncoderReranker,
    _fetch_missing_article_siblings,
    _reranker_cpu_threads,
)


def _hit(hit_id: int, clause: str, point: str | None = None, text: str = "Nội dung khoản."):
    return SimpleNamespace(
        id=hit_id,
        score=0.6,
        payload={
            "document_number": "320/2025/NĐ-CP",
            "article": "Điều 9",
            "clause": clause,
            "point": point,
            "text_content": text,
        },
    )


class FailedLoadTests(unittest.TestCase):
    def test_failed_load_is_not_retried_on_every_request(self):
        reranker = _CrossEncoderReranker()
        loader = MagicMock(side_effect=OSError("huggingface.co unreachable"))
        with patch.object(settings, "RAG_RERANKER_ENABLED", True), patch.object(reranker, "_load", loader):
            self.assertEqual(reranker.status(), "not_loaded")
            self.assertIsNone(reranker.score("q", ["a"]))
            self.assertIsNone(reranker.score("q", ["b"]))
            self.assertIsNone(reranker.score("q", ["c"]))
            self.assertEqual(reranker.status(), "failed")
        self.assertEqual(loader.call_count, 1)

    def test_disabled_reranker_reports_disabled(self):
        with patch.object(settings, "RAG_RERANKER_ENABLED", False):
            self.assertEqual(_CrossEncoderReranker().status(), "disabled")


class SiblingClauseTests(unittest.TestCase):
    def test_point_chunks_of_another_clause_cannot_crowd_out_khoan_1(self):
        top = _hit(1, "Khoản 2", "Điểm c", "Có chứng từ thanh toán theo quy định tại khoản 3 Điều này.")
        k1 = _hit(2, "Khoản 1", None, "Doanh nghiệp được trừ mọi khoản chi nếu đáp ứng đủ điều kiện.")
        k3a = _hit(3, "Khoản 3", "Điểm a")
        k3b = _hit(4, "Khoản 3", "Điểm b")

        def _scroll(**kwargs):
            wanted = kwargs["scroll_filter"].must[-1].match.value
            # Qdrant returns chunks in id order; Khoản 3 has two point chunks.
            return ([p for p in (k1, k3a, k3b) if p.payload["clause"] == wanted], None)

        fake_qdrant = MagicMock()
        fake_qdrant.scroll.side_effect = _scroll
        with patch("app.modules.rag.retriever.qdrant_client", fake_qdrant):
            siblings = _fetch_missing_article_siblings([top], "2026-01-01", "2026-12-31")

        self.assertEqual([s.id for s in siblings], [2, 3])
        self.assertEqual(fake_qdrant.scroll.call_count, 2)

    def test_old_single_scroll_result_order_no_longer_drops_khoan_1(self):
        top = _hit(1, "Khoản 2", "Điểm c", "Theo quy định tại khoản 3 Điều này.")
        k1 = _hit(2, "Khoản 1")
        k3a = _hit(3, "Khoản 3", "Điểm a")
        k3b = _hit(4, "Khoản 3", "Điểm b")
        fake_qdrant = MagicMock()
        # A mixed result where the Khoản 3 points come first, as the old limit=2 scroll could return.
        fake_qdrant.scroll.return_value = ([k3a, k3b, k1], None)
        with patch("app.modules.rag.retriever.qdrant_client", fake_qdrant):
            siblings = _fetch_missing_article_siblings([top], "2026-01-01", "2026-12-31")
        self.assertIn(2, [s.id for s in siblings])

    def test_clause_opening_chunk_is_preferred_over_points(self):
        top = _hit(1, "Khoản 2", "Điểm a", "Nội dung điểm a.")
        k1_point = _hit(5, "Khoản 1", "Điểm a")
        k1_opening = _hit(6, "Khoản 1", None)
        fake_qdrant = MagicMock()
        fake_qdrant.scroll.return_value = ([k1_point, k1_opening], None)
        with patch("app.modules.rag.retriever.qdrant_client", fake_qdrant):
            siblings = _fetch_missing_article_siblings([top], "2026-01-01", "2026-12-31")
        self.assertEqual([s.id for s in siblings], [6])


class CpuThreadAndDraftLimitTests(unittest.TestCase):
    def test_default_threads_leave_half_the_cores_to_ollama(self):
        with patch.object(settings, "RAG_RERANKER_CPU_THREADS", 0), patch("os.cpu_count", return_value=12):
            self.assertEqual(_reranker_cpu_threads(), 6)

    def test_configured_threads_win(self):
        with patch.object(settings, "RAG_RERANKER_CPU_THREADS", 3):
            self.assertEqual(_reranker_cpu_threads(), 3)

    def test_drafts_keep_ten_clauses(self):
        self.assertEqual(DRAFT_RETRIEVAL_LIMIT, 10)


if __name__ == "__main__":
    unittest.main()
