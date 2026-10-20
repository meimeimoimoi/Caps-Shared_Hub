import logging

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse

from app.schemas.errors import ErrorMessage

logger = logging.getLogger(__name__)


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(Exception)
    async def handle_unexpected_error(request: Request, exc: Exception):
        logger.error(
            "Unhandled error for %s %s", request.method, request.url.path,
            exc_info=(type(exc), exc, exc.__traceback__),
        )
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": ErrorMessage.INTERNAL_ERROR},
        )
