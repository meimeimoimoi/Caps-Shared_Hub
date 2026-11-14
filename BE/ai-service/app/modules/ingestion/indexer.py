from datetime import date, datetime
import uuid
from typing import Any

from qdrant_client.models import (
    FieldCondition,
    Filter,
    FilterSelector,
    MatchValue,
    PointStruct,
)

from app.config import settings
from app.core.models import embedding_model
from app.core.qdrant import qdrant_client
from app.schemas.statuses import DocumentStatus


def to_rfc3339(date_str: str | None, is_end: bool = False) -> str | None:
    """Convert YYYY-MM-DD or ISO-8601 date strings to RFC 3339 UTC format for Qdrant."""
    if not date_str:
        return None
    clean_date = str(date_str).strip()
    if "T" in clean_date:
        datetime.fromisoformat(clean_date.replace("Z", "+00:00"))
        return clean_date
    date.fromisoformat(clean_date)
    time_part = "T23:59:59Z" if is_end else "T00:00:00Z"
    return f"{clean_date}{time_part}"


def _build_document_filter(knowledge_document_id: str) -> Filter:
    return Filter(
        must=[
            FieldCondition(
                key="knowledge_document_id",
                match=MatchValue(value=knowledge_document_id),
            )
        ]
    )


class LegalIndexer:
    """Handles Qdrant vector indexing, deduplication, deletion, and metadata updates."""

    @staticmethod
    def delete_by_document_id(knowledge_document_id: str) -> int:
        """Delete all vector points belonging to a knowledge document and return deleted count."""
        doc_filter = _build_document_filter(knowledge_document_id)
        existing = qdrant_client.count(
            collection_name=settings.QDRANT_COLLECTION,
            count_filter=doc_filter,
            exact=True,
        ).count
        if existing > 0:
            qdrant_client.delete(
                collection_name=settings.QDRANT_COLLECTION,
                points_selector=FilterSelector(filter=doc_filter),
                wait=True,
            )
        return existing

    @staticmethod
    def update_document_metadata(
        knowledge_document_id: str,
        updates: dict[str, Any],
    ) -> int:
        """Update temporal validity or status payload on all points of a document."""
        payload: dict[str, Any] = {}
        if "effective_from" in updates:
            if not updates["effective_from"]:
                raise ValueError("effective_from cannot be null or empty.")
            payload["effective_from"] = to_rfc3339(updates["effective_from"], is_end=False)
        if "effective_to" in updates:
            payload["effective_to"] = (
                to_rfc3339(updates["effective_to"], is_end=True)
                if updates["effective_to"]
                else None
            )
        if "status" in updates:
            status_val = updates["status"]
            if status_val is None:
                raise ValueError("status cannot be null.")
            payload["status"] = (
                status_val.value if isinstance(status_val, DocumentStatus) else status_val
            )

        if not payload:
            raise ValueError("At least one metadata field must be provided.")

        doc_filter = _build_document_filter(knowledge_document_id)
        matched = qdrant_client.count(
            collection_name=settings.QDRANT_COLLECTION,
            count_filter=doc_filter,
            exact=True,
        ).count
        if matched == 0:
            return 0

        qdrant_client.set_payload(
            collection_name=settings.QDRANT_COLLECTION,
            payload=payload,
            points=FilterSelector(filter=doc_filter),
            wait=True,
        )
        return matched

    @staticmethod
    def index_to_qdrant(chunks: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """Embed chunks, remove stale points for the same document, and upsert new points."""
        if not chunks:
            return []

        texts = [c["text"] for c in chunks]

        # Generate dense embeddings before deleting stale vectors so failures stay non-destructive.
        vectors = embedding_model.embed_documents(texts)

        points = []
        kb_chunks_for_net = []

        for idx, (c, vec) in enumerate(zip(chunks, vectors)):
            point_id = str(uuid.uuid4())

            eff_from_rfc = to_rfc3339(c["effective_from"], is_end=False)
            eff_to_rfc = (
                to_rfc3339(c.get("effective_to"), is_end=True)
                if c.get("effective_to")
                else None
            )

            payload = {
                "knowledge_document_id": c["doc_id"],
                "legal_source_id": c["source_id"],
                "document_number": c["doc_number"],
                "document_title": c.get("doc_title") or "",
                "article": c["article"],
                "clause": c["clause"],
                "point": c["point"],
                "effective_from": eff_from_rfc,
                "effective_to": eff_to_rfc,
                "text_content": c["text"],
                "status": DocumentStatus.APPROVED,
            }

            points.append(PointStruct(id=point_id, vector=vec, payload=payload))

            kb_chunks_for_net.append(
                {
                    "chunk_index": idx,
                    "qdrant_point_id": point_id,
                    "article": c["article"],
                    "clause": c["clause"],
                    "point": c["point"],
                    "effective_from": c["effective_from"],
                    "effective_to": c.get("effective_to"),
                    "metadata": payload,
                }
            )

        for doc_id in dict.fromkeys(c["doc_id"] for c in chunks if c.get("doc_id")):
            LegalIndexer.delete_by_document_id(doc_id)

        qdrant_client.upsert(collection_name=settings.QDRANT_COLLECTION, points=points)
        return kb_chunks_for_net
