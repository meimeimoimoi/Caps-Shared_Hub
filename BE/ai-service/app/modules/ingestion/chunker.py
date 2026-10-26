from typing import Any, Dict, List  # noqa: UP035


class LegalChunker:
    @staticmethod
    def chunk_document(data: dict[str, Any]) -> list[dict[str, Any]]:
        chunks = []
        doc_num = data["document_number"]
        doc_title = data["title"]
        doc_id = data["knowledge_document_id"]
        source_id = data["legal_source_id"]
        eff_from = data["effective_from"]
        eff_to = data.get("effective_to")
        content_json = data.get("content_json", {})

        articles = content_json.get("articles", [])
        for art in articles:
            art_title = art.get("title", "")
            clauses = art.get("clauses", [])

            if not clauses:
                # Điều không có Khoản
                text = f"Văn bản: {doc_num} - {doc_title}\n{art_title}\nNội dung: {art.get('content', '')}"
                chunks.append(
                    {
                        "doc_id": doc_id,
                        "source_id": source_id,
                        "doc_number": doc_num,
                        "article": art_title,
                        "clause": None,
                        "point": None,
                        "effective_from": eff_from,
                        "effective_to": eff_to,
                        "text": text.strip(),
                    }
                )
                continue

            for cl in clauses:
                cl_title = cl.get("title", "")
                points = cl.get("points", [])

                if points:
                    for pt in points:
                        pt_title = pt.get("title", "")
                        # Ghép đầy đủ ngữ cảnh cấp cha
                        text = f"Văn bản: {doc_num}\n{art_title} -> {cl_title} -> {pt_title}\nNội dung: {pt.get('content', '')}"
                        chunks.append(
                            {
                                "doc_id": doc_id,
                                "source_id": source_id,
                                "doc_number": doc_num,
                                "article": art_title,
                                "clause": cl_title,
                                "point": pt_title,
                                "effective_from": eff_from,
                                "effective_to": eff_to,
                                "text": text.strip(),
                            }
                        )
                else:
                    text = f"Văn bản: {doc_num}\n{art_title} -> {cl_title}\nNội dung: {cl.get('content', '')}"
                    chunks.append(
                        {
                            "doc_id": doc_id,
                            "source_id": source_id,
                            "doc_number": doc_num,
                            "article": art_title,
                            "clause": cl_title,
                            "point": None,
                            "effective_from": eff_from,
                            "effective_to": eff_to,
                            "text": text.strip(),
                        }
                    )
        return chunks
