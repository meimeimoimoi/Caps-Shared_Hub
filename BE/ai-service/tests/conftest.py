import pytest

from app.config import settings


@pytest.fixture(autouse=True)
def _disable_live_hf_reranker_in_unit_tests(monkeypatch):
    """Avoid downloading multi-GB HuggingFace weights during offline unit tests unless explicitly enabled."""
    monkeypatch.setattr(settings, "RAG_RERANKER_ENABLED", False)
