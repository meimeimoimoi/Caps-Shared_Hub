from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeoutError
import threading

from app.config import settings

_REQUEST_EXECUTOR = ThreadPoolExecutor(max_workers=8, thread_name_prefix="ai-req")
_OLLAMA_SEMAPHORE = threading.BoundedSemaphore(max(1, settings.OLLAMA_MAX_CONCURRENCY))


def run_with_total_timeout(fn, timeout_seconds: float):
    """Limit concurrent Ollama load and enforce a hard wall-clock budget per request."""
    def _guarded():
        if not _OLLAMA_SEMAPHORE.acquire(timeout=timeout_seconds):
            raise TimeoutError("Timed out waiting for available AI worker slot.")
        try:
            return fn()
        finally:
            _OLLAMA_SEMAPHORE.release()

    future = _REQUEST_EXECUTOR.submit(_guarded)
    try:
        return future.result(timeout=timeout_seconds)
    except FuturesTimeoutError as e:
        future.cancel()
        raise TimeoutError("Total request timeout exceeded.") from e
