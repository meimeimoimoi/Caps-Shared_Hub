from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PayloadSchemaType
from app.config import settings

qdrant_client = QdrantClient(url=settings.QDRANT_URL)

def init_qdrant():
    """Khởi tạo collection với payload index phục vụ cho temporal RAG"""
    col_name = settings.QDRANT_COLLECTION
    collections = [c.name for c in qdrant_client.get_collections().collections]

    if col_name not in collections:
        # bge-m3 có vector size là 1024
        qdrant_client.create_collection(
            collection_name=col_name,
            vectors_config=VectorParams(size=1024, distance=Distance.COSINE)
        )
        # Các chỉ mục để tối ưu tốc độ lọc
        qdrant_client.create_payload_index(col_name, "status", PayloadSchemaType.KEYWORD)
        qdrant_client.create_payload_index(col_name, "effective_from", PayloadSchemaType.KEYWORD)
        qdrant_client.create_payload_index(col_name, "effective_to", PayloadSchemaType.KEYWORD)
        qdrant_client.create_payload_index(col_name, "legal_source_id", PayloadSchemaType.KEYWORD)
        print(f"--> [Qdrant] Collection '{col_name}' created successfully.")
