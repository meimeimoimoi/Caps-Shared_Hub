import base64
import logging

from fastapi import HTTPException, status
import httpx
import pymupdf

from app.config import settings
from app.core.ai_response import parse_ai_response
from app.modules.cv_screening.prompts import (
    SYSTEM_PROMPT,
    build_text_extraction_prompt,
    build_vision_extraction_prompt,
)
from app.schemas.cv_dto import CvExtractResponse, ExtractedDocumentData
from app.schemas.errors import ErrorMessage

logger = logging.getLogger(__name__)

_PNG_MAGIC = b"\x89PNG\r\n\x1a\n"
_JPEG_MAGIC = b"\xff\xd8\xff"
_PDF_MAGIC = b"%PDF-"
_MAX_TEXT_CHARS = 24_000


class CvExtractor:
    """Extracts structured CV metadata using local Ollama models only (non-CV documents are rejected)."""

    @staticmethod
    def _detect_kind(data: bytes) -> str | None:
        if data.startswith(_PDF_MAGIC):
            return "pdf"
        if data.startswith(_JPEG_MAGIC):
            return "image"
        if data.startswith(_PNG_MAGIC):
            return "image"
        return None

    @staticmethod
    def _call_ollama(
        model: str,
        user_prompt: str,
        images_b64: list[str] | None = None,
    ) -> ExtractedDocumentData:
        message: dict[str, object] = {"role": "user", "content": user_prompt}
        if images_b64:
            message["images"] = images_b64

        payload = {
            "model": model,
            "stream": False,
            "format": "json",
            "options": {"temperature": 0},
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                message,
            ],
        }

        url = f"{settings.OLLAMA_BASE_URL.rstrip('/')}/api/chat"
        resp = httpx.post(
            url,
            json=payload,
            timeout=float(settings.CV_EXTRACTION_TIMEOUT_SECONDS),
        )
        if resp.status_code != status.HTTP_200_OK:
            logger.warning("Ollama returned HTTP %s during CV extraction", resp.status_code)
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=ErrorMessage.INTERNAL_ERROR,
            )

        body = resp.json()
        raw_content = (body.get("message") or {}).get("content", "")
        return parse_ai_response(raw_content, ExtractedDocumentData)

    @classmethod
    def extract(
        cls,
        content: bytes,
        evidence_type: str,
        vision_enabled: bool = True,
    ) -> CvExtractResponse:
        normalized_group = evidence_type.strip().upper()
        if normalized_group != "CV":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only CV documents may be processed by AI.",
            )

        kind = cls._detect_kind(content)
        if kind is None:
            return CvExtractResponse(
                status="UNREADABLE",
                is_unreadable=True,
                unreadable_reason="UNSUPPORTED_FILE_FORMAT",
            )

        effective_vision = bool(settings.VISION_ENABLED and vision_enabled)

        if kind == "image":
            if not effective_vision:
                return CvExtractResponse(
                    status="VISION_DISABLED",
                    is_image=True,
                    is_unreadable=True,
                    unreadable_reason="IMAGE_VISION_DISABLED",
                )

            encoded = base64.b64encode(content).decode("ascii")
            extracted = cls._call_ollama(
                settings.VISION_MODEL,
                build_vision_extraction_prompt(normalized_group),
                images_b64=[encoded],
            )
            return CvExtractResponse(
                status="EXTRACTED",
                is_image=True,
                extracted=extracted,
            )

        # PDF handling: inspect selectable text first, fall back to rendered page vision only if scanned.
        try:
            doc = pymupdf.open(stream=content, filetype="pdf")
        except Exception:
            logger.info("Failed to open PDF document for group %s", normalized_group)
            return CvExtractResponse(
                status="UNREADABLE",
                is_unreadable=True,
                unreadable_reason="CORRUPT_PDF",
            )

        with doc:
            if doc.page_count == 0:
                return CvExtractResponse(
                    status="UNREADABLE",
                    is_unreadable=True,
                    unreadable_reason="CORRUPT_PDF",
                )

            page_limit = min(doc.page_count, settings.CV_MAX_PAGES)
            text_parts = [doc[i].get_text("text") or "" for i in range(page_limit)]
            combined_text = "\n".join(text_parts).strip()

            if len(combined_text) >= settings.CV_MIN_TEXT_CHARS:
                extracted = cls._call_ollama(
                    settings.LLM_MODEL,
                    build_text_extraction_prompt(
                        normalized_group, combined_text[:_MAX_TEXT_CHARS]
                    ),
                )
                return CvExtractResponse(
                    status="EXTRACTED",
                    is_scanned=False,
                    extracted=extracted,
                )

            if not effective_vision:
                return CvExtractResponse(
                    status="VISION_DISABLED",
                    is_scanned=True,
                    is_unreadable=True,
                    unreadable_reason="SCANNED_PDF_VISION_DISABLED",
                )

            vision_limit = min(doc.page_count, settings.CV_VISION_MAX_PAGES)
            rendered_images: list[str] = []
            for idx in range(vision_limit):
                pix = doc[idx].get_pixmap(dpi=150)
                rendered_images.append(base64.b64encode(pix.tobytes("png")).decode("ascii"))

            extracted = cls._call_ollama(
                settings.VISION_MODEL,
                build_vision_extraction_prompt(normalized_group),
                images_b64=rendered_images,
            )
            return CvExtractResponse(
                status="EXTRACTED",
                is_scanned=True,
                extracted=extracted,
            )
