import logging
import re
from typing import TypeVar

from fastapi import HTTPException, status
from pydantic import BaseModel, ValidationError

from app.schemas.errors import ErrorMessage

ResultModel = TypeVar("ResultModel", bound=BaseModel)
logger = logging.getLogger(__name__)


def parse_ai_response(content: str, model: type[ResultModel]) -> ResultModel:
    # Accept JSON with an optional Markdown code fence, without extracting fragments.
    if not isinstance(content, str):
        logger.warning("AI returned non-text content for %s", model.__name__)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=ErrorMessage.INVALID_AI_RESPONSE,
        )
    text = content.strip()
    fenced = re.fullmatch(r"```(?:json)?\s*([\s\S]*?)\s*```", text)
    if fenced:
        text = fenced.group(1)
    try:
        return model.model_validate_json(text)
    except ValidationError as exc:
        logger.warning(
            "AI response failed validation for %s: %s",
            model.__name__,
            [(error["loc"], error["type"]) for error in exc.errors()],
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=ErrorMessage.INVALID_AI_RESPONSE,
        ) from exc
