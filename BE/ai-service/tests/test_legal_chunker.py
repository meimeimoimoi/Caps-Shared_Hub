import unittest
from types import SimpleNamespace

from app.modules.ingestion.chunker import LegalChunker
from app.modules.rag.generator import build_citations, format_context_chunks
from app.schemas.ingestion_dto import IngestDocRequest


def _doc(content_json):
    return {
        "knowledge_document_id": "doc-1",
        "legal_source_id": "src-1",
        "document_number": "89/2026/TT-BTC",
        "title": "Thông tư quản lý thuế",
        "effective_from": "2026-07-01",
        "content_json": content_json,
    }


class LegalChunkerAppendixTests(unittest.TestCase):
    def test_appendices_are_chunked_after_articles(self):
        chunks = LegalChunker.chunk_document(
            _doc(
                {
                    "chapters": [
                        {
                            "number": None,
                            "articles": [
                                {"number": "1", "title": "Phạm vi", "units": [{"clause": "1", "text": "Nội dung."}]}
                            ],
                        }
                    ],
                    "appendices": [
                        {"title": "Phụ lục I", "text": "03-2/TNDN | Phụ lục chuyển lỗ"},
                        {"title": "Phụ lục II", "text": "  "},
                    ],
                }
            )
        )
        self.assertEqual([c["article"] for c in chunks], ["Điều 1", "Phụ lục I"])
        appendix = chunks[-1]
        self.assertIn("03-2/TNDN | Phụ lục chuyển lỗ", appendix["text"])
        self.assertEqual(appendix["effective_from"], "2026-07-01")

    def test_appendices_only_document_still_has_chunks(self):
        chunks = LegalChunker.chunk_document(_doc({"appendices": [{"title": "Phụ lục I", "text": "Danh mục"}]}))
        self.assertEqual(len(chunks), 1)


class AmendsTargetTests(unittest.TestCase):
    def test_crawler_amends_reaches_chunk_and_legal_basis(self):
        target = "Bổ sung khoản 15 Điều 4 Nghị định số 320/2025/NĐ-CP"
        req = IngestDocRequest(
            **_doc(None),
            chunks=[{"chunk_index": 0, "article": "2", "clause": None, "point": None, "path": "Điều 2",
                     "text": "“15. Thu nhập được miễn thuế.”", "amends": target}],
        )
        chunk = LegalChunker.prepare_ingest_chunks(req)[0]
        self.assertEqual(chunk["amends"], target)

        hit = SimpleNamespace(payload={"document_number": "141/2026/NĐ-CP", "article": "Điều 2", "amends": target})
        self.assertEqual(build_citations([hit])[0]["amends"], target)
        self.assertIn(target, format_context_chunks([hit]))


class LegalChunkerAmendmentTests(unittest.TestCase):
    def _articles(self, articles):
        chunks = LegalChunker.chunk_document(_doc({"chapters": [{"number": None, "articles": articles}]}))
        return [(c["article"], c["clause"]) for c in chunks]

    def test_amending_article_cites_the_amended_clause(self):
        quoted = [{"clause": None, "text": "“15. Thu nhập của doanh nghiệp...”"}]
        result = self._articles(
            [
                {
                    "number": "2",
                    "title": "Bổ sung khoản 15 Điều 4 Nghị định số 320/2025/NĐ-CP ngày 15 tháng 12 năm 2025 của Chính phủ",
                    "units": quoted,
                },
                {"number": "3", "title": "Bổ sung khoản 14a vào sau khoản 14 Điều 4 của Luật Thuế TNDN", "units": quoted},
            ]
        )
        self.assertEqual(
            result,
            [
                ("Điều 2 (bổ sung khoản 15 Điều 4 Nghị định số 320/2025/NĐ-CP)", None),
                ("Điều 3 (bổ sung khoản 14a vào sau khoản 14 Điều 4 của Luật Thuế TNDN)", None),
            ],
        )

    def test_other_articles_keep_plain_label(self):
        result = self._articles(
            [
                {"number": "1", "title": "Sửa đổi, bổ sung một số điều của Nghị định số 68/2026/NĐ-CP", "units": []},
                {"number": "3", "title": "Hiệu lực thi hành", "units": [{"text": "Có hiệu lực từ 01/01/2026."}]},
            ]
        )
        self.assertEqual([a for a, _ in result], ["Điều 1", "Điều 3"])


if __name__ == "__main__":
    unittest.main()
