import uuid
from typing import List, Dict, Any
from qdrant_client.models import PointStruct
from app.core.models import embedding_model
from app.core.qdrant import qdrant_client
from app.config import settings
from app.schemas.statuses import DocumentStatus

def to_rfc3339(date_str: str | None, is_end: bool = False) -> str | None:
    if not date_str:
        return None
    clean_date = str(date_str).strip()
    if "T" in clean_date:
        return clean_date
    time_part = "T23:59:59Z" if is_end else "T00:00:00Z"
    return f"{clean_date}{time_part}"

class LegalIndexer:
    @staticmethod
    def index_to_qdrant(chunks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        texts = [c["text"] for c in chunks]
        
        # 1. Gọi bge-m3 để tạo Embeddings
        vectors = embedding_model.embed_documents(texts)
        
        points = []
        kb_chunks_for_net = []

        for idx, (c, vec) in enumerate(zip(chunks, vectors)):
            point_id = str(uuid.uuid4())
            
            # Chuẩn hóa ngày tháng theo RFC 3339 cho Qdrant
            eff_from_rfc = to_rfc3339(c["effective_from"], is_end=False)
            eff_to_rfc = to_rfc3339(c.get("effective_to"), is_end=True) if c.get("effective_to") else None

            payload = {
                "knowledge_document_id": c["doc_id"],
                "legal_source_id": c["source_id"],
                "document_number": c["doc_number"],
                "article": c["article"],
                "clause": c["clause"],
                "point": c["point"],
                "effective_from": eff_from_rfc,
                "effective_to": eff_to_rfc,
                "text_content": c["text"],
                "status": DocumentStatus.APPROVED
            }

            points.append(PointStruct(id=point_id, vector=vec, payload=payload))

            # Trả về danh sách để .NET ghi vào Postgres bảng kb_chunk
            kb_chunks_for_net.append({
                "chunk_index": idx,
                "qdrant_point_id": point_id,
                "article": c["article"],
                "clause": c["clause"],
                "point": c["point"],
                "effective_from": c["effective_from"],
                "effective_to": c.get("effective_to"),
                "metadata": payload
            })

        # 2. Batch Upsert lên Qdrant
        qdrant_client.upsert(
            collection_name=settings.QDRANT_COLLECTION,
            points=points
        )
        return kb_chunks_for_net
