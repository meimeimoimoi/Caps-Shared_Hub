import unittest

from app.modules.ingestion.chunker import LegalChunker


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


if __name__ == "__main__":
    unittest.main()
