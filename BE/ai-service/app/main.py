from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI, status
from fastapi.responses import JSONResponse
import httpx

from app.api.exception_handlers import register_exception_handlers
from app.api.routes import router
from app.config import settings
from app.core.qdrant import init_qdrant, qdrant_client

logger = logging.getLogger(__name__)


def _has_ollama_model(available_names: set[str], target_model: str) -> bool:
    if target_model in available_names:
        return True
    if ":" not in target_model and f"{target_model}:latest" in available_names:
        return True
    return False


def _check_qdrant_ready() -> str:
    try:
        collections = {c.name for c in qdrant_client.get_collections().collections}
        if settings.QDRANT_COLLECTION not in collections:
            return "collection_missing"
        return "ok"
    except Exception:
        logger.warning("Qdrant readiness check failed", exc_info=True)
        return "unavailable"


def _check_ollama_ready() -> str:
    tags_url = f"{settings.OLLAMA_BASE_URL.rstrip('/')}/api/tags"
    try:
        resp = httpx.get(tags_url, timeout=float(settings.QDRANT_TIMEOUT_SECONDS))
        if resp.status_code != status.HTTP_200_OK:
            return "unavailable"
        models_data = resp.json().get("models") or []
        available_names = {
            m.get("name", "") for m in models_data if isinstance(m, dict)
        }
        if not _has_ollama_model(available_names, settings.LLM_MODEL) or not _has_ollama_model(
            available_names, settings.EMBEDDING_MODEL
        ):
            return "model_missing"
        return "ok"
    except Exception:
        logger.warning("Ollama readiness check failed", exc_info=True)
        return "unavailable"


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure the Qdrant collection and payload indexes exist before serving requests.
    init_qdrant()
    yield


app = FastAPI(
    title="SHFT AI Engine Service",
    description="Stateless AI & RAG Engine for the .NET 9 Backend",
    version="1.0.0",
    lifespan=lifespan,
)

register_exception_handlers(app)
app.include_router(router)


@app.get("/health")
@app.get("/healthz")
def healthz():
    """Liveness probe aligned with .NET services."""
    return {"status": "ok", "service": "SHFT AI Engine"}


@app.get("/readyz")
def readyz():
    """Readiness probe verifying Qdrant collection and required Ollama models."""
    qdrant_status = _check_qdrant_ready()
    ollama_status = _check_ollama_ready()
    checks = {"qdrant": qdrant_status, "ollama": ollama_status}

    if qdrant_status != "ok" or ollama_status != "ok":
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"status": "unavailable", "checks": checks},
        )

    return {"status": "ready", "checks": checks}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app", host=settings.APP_HOST, port=settings.APP_PORT, reload=True
    )
