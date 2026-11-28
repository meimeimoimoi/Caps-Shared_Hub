from contextlib import asynccontextmanager
import logging
import threading
import time

from fastapi import FastAPI, status
from fastapi.responses import JSONResponse
import httpx

from app.api.dependencies import is_internal_key_required
from app.api.exception_handlers import register_exception_handlers
from app.api.routes import router
from app.config import settings
from app.core.qdrant import init_qdrant, qdrant_client
from app.modules.rag.retriever import reranker_status, warmup_reranker

logger = logging.getLogger(__name__)

# Rejection causes and retries are logged at INFO; with no handler Python prints only warnings.
_app_logger = logging.getLogger("app")
if not _app_logger.handlers:
    _log_handler = logging.StreamHandler()
    _log_handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(name)s: %(message)s"))
    _app_logger.addHandler(_log_handler)
    _app_logger.setLevel(logging.INFO)
    _app_logger.propagate = False

_READYZ_CACHE_TTL_SECONDS = 15.0
_last_ollama_probe_ok_at: float = 0.0


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


def _probe_ollama_inference() -> bool:
    """Send a minimal 1-token prompt to verify the Ollama runner is responsive, not stuck."""
    global _last_ollama_probe_ok_at
    now = time.monotonic()
    if _last_ollama_probe_ok_at > 0 and (now - _last_ollama_probe_ok_at) < _READYZ_CACHE_TTL_SECONDS:
        return True

    gen_url = f"{settings.OLLAMA_BASE_URL.rstrip('/')}/api/generate"
    resp = httpx.post(
        gen_url,
        json={
            "model": settings.LLM_MODEL,
            "prompt": "ok",
            "stream": False,
            "options": {"num_predict": 1, "temperature": 0},
        },
        timeout=float(settings.READYZ_PROBE_TIMEOUT_SECONDS),
    )
    if resp.status_code != status.HTTP_200_OK:
        return False
    _last_ollama_probe_ok_at = time.monotonic()
    return True


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
        if not _probe_ollama_inference():
            return "inference_unavailable"
        return "ok"
    except Exception:
        logger.warning("Ollama readiness check failed", exc_info=True)
        return "unavailable"


def _warmup_ollama_models() -> None:
    """Preload LLM, embedding, and Cross-Encoder models in the background to avoid cold-start stalls."""
    warmup_reranker()
    base = settings.OLLAMA_BASE_URL.rstrip("/")
    try:
        httpx.post(
            f"{base}/api/generate",
            json={
                "model": settings.LLM_MODEL,
                "prompt": "ok",
                "stream": False,
                "keep_alive": settings.OLLAMA_KEEP_ALIVE,
                "options": {"num_predict": 1, "temperature": 0},
            },
            timeout=float(settings.OLLAMA_TIMEOUT_SECONDS),
        )
        httpx.post(
            f"{base}/api/embeddings",
            json={
                "model": settings.EMBEDDING_MODEL,
                "prompt": "thuế thu nhập doanh nghiệp",
                "keep_alive": settings.OLLAMA_KEEP_ALIVE,
            },
            timeout=float(settings.OLLAMA_TIMEOUT_SECONDS),
        )
    except Exception:
        logger.debug("Background Ollama warm-up skipped or failed", exc_info=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Refuse startup outside dev when INTERNAL_API_KEY is missing; warn in local dev.
    if not settings.INTERNAL_API_KEY.strip():
        if is_internal_key_required():
            raise RuntimeError(
                "INTERNAL_API_KEY must be set when APP_ENV is not dev (or REQUIRE_INTERNAL_API_KEY=true)."
            )
        logger.warning(
            "INTERNAL_API_KEY is empty; /api/v1 endpoints accept requests without X-Internal-Key. "
            "Set INTERNAL_API_KEY before exposing externally."
        )
    # Ensure the Qdrant collection and payload indexes exist before serving requests.
    init_qdrant()
    if settings.WARMUP_ON_STARTUP and not isinstance(init_qdrant, type(lifespan)):
        # Skip network warm-up when init_qdrant is mocked during unit tests.
        if getattr(init_qdrant, "__module__", "") == "app.core.qdrant":
            threading.Thread(
                target=_warmup_ollama_models,
                name="ollama-warmup",
                daemon=True,
            ).start()
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
    # Reported only: without the Cross-Encoder, chat still answers on the hybrid RRF ranking.
    checks = {"qdrant": qdrant_status, "ollama": ollama_status, "reranker": reranker_status()}

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
