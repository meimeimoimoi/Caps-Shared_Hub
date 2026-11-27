from pathlib import Path
import sys
from types import SimpleNamespace
import unittest
from unittest.mock import MagicMock, patch

import torch

AI_SERVICE_ROOT = Path(__file__).resolve().parents[1]
if str(AI_SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(AI_SERVICE_ROOT))

from app.config import settings  # noqa: E402
from app.modules.rag.retriever import (  # noqa: E402
    TemporalRetriever,
    _CrossEncoderReranker,
    _fetch_missing_article_siblings,
    _prepare_rerank_query,
    _prepare_search_query,
    _rerank_hits,
    _select_diverse_rate_clauses,
    needs_rate_clauses,
)


def _make_hit(
    text: str,
    *,
    doc: str = "67/2025/QH15",
    article: str = "Điều 10",
    clause: str | None = "Khoản 1",
    point: str | None = None,
    score: float = 0.60,
    hit_id: int = 1,
):
    return SimpleNamespace(
        id=hit_id,
        score=score,
        payload={
            "document_number": doc,
            "document_title": "Văn bản pháp luật thuế",
            "article": article,
            "clause": clause,
            "point": point,
            "effective_from": "2025-10-01T00:00:00Z",
            "effective_to": None,
            "text_content": text,
        },
    )


class HybridRerankerTests(unittest.TestCase):
    def test_longer_unaccented_phrase_takes_precedence_over_substring(self):
        expanded = _prepare_search_query("chi phi khong duoc tru nam 2026")
        self.assertIn("khoản chi không được trừ", expanded)
        self.assertNotIn("(khoản chi được trừ)", expanded)

    def test_rerank_query_expands_cit_acronym_to_disambiguate_from_pit(self):
        expanded = _prepare_rerank_query("Tạm nộp thuế TNDN quý 1 có được giảm 30% không?")
        self.assertIn("thuế thu nhập doanh nghiệp", expanded.lower())

    def test_hybrid_rrf_boosts_exact_form_code_over_higher_dense_generic_hit(self):
        generic_hit = _make_hit(
            "Quy định chung về hồ sơ khai quyết toán thuế năm của người nộp thuế.",
            doc="89/2026/TT-BTC",
            article="Điều 21",
            clause="Khoản 5",
            score=0.65,
            hit_id=1,
        )
        form_hit = _make_hit(
            "Phụ lục 03-5/TNDN áp dụng đối với thu nhập từ chuyển nhượng bất động sản khi quyết toán.",
            doc="89/2026/TT-BTC",
            article="Phụ lục I",
            clause=None,
            score=0.51,
            hit_id=2,
        )
        ranked = _rerank_hits(
            "Khi nào doanh nghiệp phải lập phụ lục 03-5/TNDN trong hồ sơ quyết toán?",
            [generic_hit, form_hit],
            limit=2,
        )
        self.assertEqual(ranked[0].id, 2)

    def test_cross_encoder_reranker_scores_and_reorders_candidates(self):
        pit_hit = _make_hit(
            "Giảm 30% số thuế thu nhập cá nhân phải nộp đối với cá nhân cư trú kinh doanh.",
            doc="398/2026/NĐ-CP",
            article="Điều 2",
            clause="Khoản 1",
            score=0.71,
            hit_id=10,
        )
        cit_hit = _make_hit(
            "Giảm 30% số thuế thu nhập doanh nghiệp phải nộp khi tạm nộp hằng quý của doanh nghiệp.",
            doc="398/2026/NĐ-CP",
            article="Điều 3",
            clause="Khoản 2",
            score=0.62,
            hit_id=20,
        )

        def _fake_tokenize(pairs, **kwargs):
            scores = [[4.0] if "doanh nghiệp" in pair[1].lower() else [-4.0] for pair in pairs]
            return {"scores": torch.tensor(scores)}

        fake_tokenizer = MagicMock(side_effect=_fake_tokenize)
        fake_model = MagicMock(side_effect=lambda **kw: SimpleNamespace(logits=kw["scores"]))
        fake_model.to.return_value = fake_model

        reranker = _CrossEncoderReranker()
        with (
            patch.object(settings, "RAG_RERANKER_ENABLED", True),
            patch.object(settings, "RAG_RERANKER_DEVICE", "cpu"),
            patch("transformers.AutoTokenizer.from_pretrained", return_value=fake_tokenizer),
            patch("transformers.AutoModelForSequenceClassification.from_pretrained", return_value=fake_model),
            patch("app.modules.rag.retriever._reranker", reranker),
        ):
            ranked = _rerank_hits(
                "Khi tạm nộp thuế TNDN hằng quý có được giảm 30% không?",
                [pit_hit, cit_hit],
                limit=2,
            )

        self.assertEqual(ranked[0].id, 20)

    def test_sibling_expansion_fetches_khoan_1_and_referenced_clause_of_top_article(self):
        top_hit = _make_hit(
            "Có chứng từ thanh toán không dùng tiền mặt đối với trường hợp quy định tại khoản 3 Điều này.",
            doc="320/2025/NĐ-CP",
            article="Điều 9",
            clause="Khoản 2",
            point="Điểm c",
            hit_id=1,
        )
        sibling_k1 = _make_hit(
            "Trừ các khoản chi không được trừ, doanh nghiệp được trừ mọi khoản chi nếu đáp ứng đủ điều kiện.",
            doc="320/2025/NĐ-CP",
            article="Điều 9",
            clause="Khoản 1",
            hit_id=2,
        )
        sibling_k3 = _make_hit(
            "Trường hợp mua hàng hóa, dịch vụ từng lần có giá trị từ 05 triệu đồng trở lên phải thanh toán không dùng tiền mặt.",
            doc="320/2025/NĐ-CP",
            article="Điều 9",
            clause="Khoản 3",
            hit_id=3,
        )

        fake_qdrant = MagicMock()
        fake_qdrant.scroll.return_value = ([sibling_k1, sibling_k3], None)
        with patch("app.modules.rag.retriever.qdrant_client", fake_qdrant):
            siblings = _fetch_missing_article_siblings([top_hit], "2026-01-01", "2026-12-31")

        self.assertEqual([s.id for s in siblings], [2, 3])

    def test_rate_clause_completeness_requires_both_general_and_revenue_tiered_clauses(self):
        only_tiered = [
            _make_hit(
                "Thuế suất 17% áp dụng đối với doanh nghiệp có tổng doanh thu năm từ trên 03 tỷ đến không quá 50 tỷ đồng.",
                clause="Khoản 3",
                hit_id=1,
            )
        ]
        general_clause = _make_hit(
            "Thuế suất thuế thu nhập doanh nghiệp là 20%, trừ trường hợp quy định tại khoản 2, khoản 3 Điều này.",
            clause="Khoản 1",
            hit_id=2,
        )
        # Missing general rate clause (e.g. TT-04 with 100B revenue) must still trigger rate expansion.
        self.assertTrue(
            needs_rate_clauses(
                "Doanh nghiệp doanh thu năm 100 tỷ, thu nhập tính thuế 5 tỷ thì thuế TNDN phải nộp là bao nhiêu?",
                only_tiered,
            )
        )
        self.assertFalse(
            needs_rate_clauses(
                "Doanh nghiệp doanh thu năm 100 tỷ, thu nhập tính thuế 5 tỷ thì thuế TNDN phải nộp là bao nhiêu?",
                only_tiered + [general_clause],
            )
        )
        picked = _select_diverse_rate_clauses([only_tiered[0], general_clause], only_tiered, max_extra=3)
        self.assertEqual([h.id for h in picked], [2])


if __name__ == "__main__":
    unittest.main()
