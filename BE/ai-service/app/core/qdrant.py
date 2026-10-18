import logging

from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PayloadSchemaType
from app.config import settings

logger = logging.getLogger(__name__)

qdrant_client = QdrantClient(url=settings.QDRANT_URL)

def init_qdrant():
    col_name = settings.QDRANT_COLLECTION
    collections = [c.name for c in qdrant_client.get_collections().collections]
    
    if col_name not in collections:
        qdrant_client.create_collection(
            collection_name=col_name,
            vectors_config=VectorParams(size=1024, distance=Distance.COSINE)
        )
    
    # Create or update payload indexes for temporal retrieval.
    try:
        qdrant_client.create_payload_index(col_name, "status", PayloadSchemaType.KEYWORD)
        qdrant_client.create_payload_index(col_name, "effective_from", PayloadSchemaType.DATETIME)
        qdrant_client.create_payload_index(col_name, "effective_to", PayloadSchemaType.DATETIME)
        qdrant_client.create_payload_index(col_name, "legal_source_id", PayloadSchemaType.KEYWORD)
    except Exception:
        logger.exception("Failed to create payload indexes for collection %s", col_name)
