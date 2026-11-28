from datetime import date, datetime
import logging

from qdrant_client import QdrantClient
from qdrant_client.models import Distance, PayloadSchemaType, VectorParams

from app.config import settings

logger = logging.getLogger(__name__)

qdrant_client = QdrantClient(
    url=settings.QDRANT_URL,
    timeout=settings.QDRANT_TIMEOUT_SECONDS,
)


def to_rfc3339(date_str: str | None, is_end: bool = False) -> str | None:
    """Validate YYYY-MM-DD or ISO-8601 date strings and convert to RFC 3339 UTC for Qdrant."""
    if not date_str:
        return None
    clean_date = str(date_str).strip()
    if "T" in clean_date:
        datetime.fromisoformat(clean_date.replace("Z", "+00:00"))
        return clean_date
    date.fromisoformat(clean_date)
    time_part = "T23:59:59Z" if is_end else "T00:00:00Z"
    return f"{clean_date}{time_part}"

def init_qdrant():
    col_name = settings.QDRANT_COLLECTION
    collections = [c.name for c in qdrant_client.get_collections().collections]
    
    if col_name not in collections:
        qdrant_client.create_collection(
            collection_name=col_name,
            vectors_config=VectorParams(size=1024, distance=Distance.COSINE)
        )
    
    # Create or update payload indexes for temporal retrieval and document lifecycle.
    try:
        qdrant_client.create_payload_index(col_name, "status", PayloadSchemaType.KEYWORD)
        qdrant_client.create_payload_index(col_name, "effective_from", PayloadSchemaType.DATETIME)
        qdrant_client.create_payload_index(col_name, "effective_to", PayloadSchemaType.DATETIME)
        qdrant_client.create_payload_index(col_name, "legal_source_id", PayloadSchemaType.KEYWORD)
        qdrant_client.create_payload_index(col_name, "knowledge_document_id", PayloadSchemaType.KEYWORD)
    except Exception:
        logger.exception("Failed to create payload indexes for collection %s", col_name)
