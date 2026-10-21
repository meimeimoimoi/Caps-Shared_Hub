from qdrant_client.models import (
    DatetimeRange,
    FieldCondition,
    Filter,
    IsEmptyCondition,
    IsNullCondition,
    MatchValue,
    PayloadField,
)

from app.config import settings
from app.core.models import embedding_model
from app.core.qdrant import qdrant_client
from app.schemas.statuses import DocumentStatus


def to_rfc3339(date_str: str, is_end: bool = False) -> str:
    """Chuyển đổi YYYY-MM-DD sang chuẩn RFC 3339 cho Qdrant"""
    if not date_str:
        return ""
    clean_date = str(date_str).strip()
    if "T" in clean_date:
        return clean_date
    time_part = "T23:59:59Z" if is_end else "T00:00:00Z"
    return f"{clean_date}{time_part}"


class TemporalRetriever:
    @staticmethod
    def retrieve(query: str, period_start: str, period_end: str, limit: int = 4):
        query_vector = embedding_model.embed_query(query)

        rfc_start = to_rfc3339(period_start, is_end=False)
        rfc_end = to_rfc3339(period_end, is_end=True)

        # Bộ lọc Temporal RAG:
        # 1. status = APPROVED
        # 2. effective_from <= kỳ thuế kết thúc
        # 3. effective_to >= kỳ thuế bắt đầu HOẶC chưa hết hiệu lực (null/empty)
        temporal_filter = Filter(
            must=[
                FieldCondition(
                    key="status", match=MatchValue(value=DocumentStatus.APPROVED)
                ),
                FieldCondition(key="effective_from", range=DatetimeRange(lte=rfc_end)),
            ],
            should=[
                FieldCondition(key="effective_to", range=DatetimeRange(gte=rfc_start)),
                IsEmptyCondition(is_empty=PayloadField(key="effective_to")),
                IsNullCondition(is_null=PayloadField(key="effective_to")),
            ],
        )

        hits = qdrant_client.search(
            collection_name=settings.QDRANT_COLLECTION,
            query_vector=query_vector,
            query_filter=temporal_filter,
            limit=limit,
            score_threshold=0.50,
        )
        return hits
