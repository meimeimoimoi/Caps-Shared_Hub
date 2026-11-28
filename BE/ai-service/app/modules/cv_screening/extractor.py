from datetime import date
import logging
import os
from pathlib import Path
import re
import sys

from fastapi import HTTPException, status
import httpx
import pymupdf

from app.config import settings
from app.core.ai_response import parse_ai_response
from app.modules.cv_screening.prompts import (
    SYSTEM_PROMPT,
    build_text_extraction_prompt,
)
from app.schemas.cv_dto import CertificateInfo, CvExtractResponse, ExtractedDocumentData
from app.schemas.errors import ErrorMessage

logger = logging.getLogger(__name__)

_PNG_MAGIC = b"\x89PNG\r\n\x1a\n"
_JPEG_MAGIC = b"\xff\xd8\xff"
_PDF_MAGIC = b"%PDF-"
_MAX_TEXT_CHARS = 24_000


_CERT_LINE_KEYWORDS = (
    "chứng chỉ",
    "chung chi",
    "certificate",
    "cpa",
    "acca",
    "đại lý thuế",
    "dai ly thue",
    "hành nghề",
    "hanh nghe",
    "bằng",
    "bang",
    "cấp",
    "cap",
    "issued",
)
_WORK_RANGE_MARKER_RE = re.compile(
    r"(?:-|–|—|\bđến\b|\bden\b|\bto\b|\bpresent\b|\bhiện tại\b|\bhien tai\b|\bnow\b)",
    re.IGNORECASE,
)


def _line_matches_certificate(line: str, cert: CertificateInfo) -> bool:
    lowered = line.lower()
    if any(kw in lowered for kw in _CERT_LINE_KEYWORDS):
        return True
    for raw in (cert.name, cert.issuer):
        if not raw:
            continue
        tokens = [t for t in re.findall(r"\w+", raw.lower()) if len(t) >= 3]
        if tokens and sum(1 for t in tokens if t in lowered) >= min(2, len(tokens)):
            return True
    return False


def _has_explicit_january_date(document_text: str, cert: CertificateInfo, year: int) -> bool:
    """Return True only when the document explicitly writes a Jan 1 date or a Jan month+year for this certificate."""
    y = str(year)
    full_jan1_patterns = (
        rf"(?<!\d)0?1[/\-.]0?1[/\-.]{y}\b",
        rf"\b{y}[/\-.]0?1[/\-.]0?1(?!\d)",
        rf"\bngày\s+0?1\s+tháng\s+0?1\s*(?:năm\s+)?{y}\b",
        rf"\b(?:jan(?:uary)?\.?\s+0?1(?:st)?,?\s+{y}|0?1(?:st)?\s+jan(?:uary)?\.?,?\s+{y})\b",
    )
    if any(re.search(pattern, document_text, re.IGNORECASE) for pattern in full_jan1_patterns):
        return True

    jan_month_patterns = (
        rf"(?<![0-9/\-.])0?1[/\-.]{y}\b",
        rf"\b{y}[/\-.]0?1(?![0-9/\-.])",
        rf"\btháng\s+0?1(?:\s*[/\-]|\s+năm\s+){y}\b",
        rf"\bjan(?:uary)?\.?\s+{y}\b",
    )
    lines = [line.strip() for line in document_text.splitlines() if line.strip()]
    for idx, line in enumerate(lines):
        if y not in line:
            continue
        if not any(re.search(pattern, line, re.IGNORECASE) for pattern in jan_month_patterns):
            continue
        if _line_matches_certificate(line, cert):
            return True
        if (
            idx > 0
            and _line_matches_certificate(lines[idx - 1], cert)
            and not _WORK_RANGE_MARKER_RE.search(line)
        ):
            return True
    return False


class CvExtractor:
    """Parses uploaded Gate 1 CV files (PDF or image) into text, then extracts fields via LLM_MODEL."""

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
    def _resolve_tessdata() -> str | None:
        """Locate the Tesseract tessdata directory for OCR."""
        configured = settings.OCR_TESSDATA_DIR.strip()
        if configured and Path(configured).is_dir():
            return configured

        env_prefix = os.getenv("TESSDATA_PREFIX", "").strip()
        if env_prefix and Path(env_prefix).is_dir():
            return env_prefix

        try:
            detected = pymupdf.get_tessdata()
            if detected and Path(detected).is_dir():
                return detected
        except Exception:
            pass

        if sys.platform == "win32":
            for fallback in (
                r"C:\Program Files\Tesseract-OCR\tessdata",
                r"C:\Program Files (x86)\Tesseract-OCR\tessdata",
            ):
                if Path(fallback).is_dir():
                    return fallback
        else:
            for fallback in (
                "/usr/share/tesseract-ocr/5/tessdata",
                "/usr/share/tesseract-ocr/4.00/tessdata",
                "/usr/share/tesseract-ocr/tessdata",
            ):
                if Path(fallback).is_dir():
                    return fallback

        return None

    @staticmethod
    def _select_ocr_language(tessdata: str, requested: str) -> str | None:
        """Return available traineddata languages matching the requested '+' list."""
        tess_dir = Path(tessdata)
        requested_langs = [part.strip() for part in requested.split("+") if part.strip()]
        available = [
            lang for lang in requested_langs if (tess_dir / f"{lang}.traineddata").is_file()
        ]
        missing = [lang for lang in requested_langs if lang not in available]
        if missing:
            logger.warning(
                "Missing Tesseract traineddata for %s in %s",
                ", ".join(missing),
                tessdata,
            )
        if available:
            return "+".join(available)
        if (tess_dir / "eng.traineddata").is_file():
            return "eng"
        return None

    @staticmethod
    def _ocr_pixmap(pix: pymupdf.Pixmap, language: str, tessdata: str) -> str:
        """Run PyMuPDF Tesseract OCR on a single pixmap and return its text."""
        normalized = pymupdf.Pixmap(pix, 0) if pix.alpha else pix
        if normalized.colorspace is None or normalized.colorspace.n != 3:
            normalized = pymupdf.Pixmap(pymupdf.csRGB, normalized)

        ocr_pdf_bytes = normalized.pdfocr_tobytes(
            compress=False,
            language=language,
            tessdata=tessdata,
        )
        ocr_doc = pymupdf.open(stream=ocr_pdf_bytes, filetype="pdf")
        with ocr_doc:
            if ocr_doc.page_count == 0:
                return ""
            return ocr_doc[0].get_text("text") or ""

    @classmethod
    def _ocr_pixmaps(cls, pixmaps: list[pymupdf.Pixmap]) -> tuple[str | None, str | None]:
        """OCR rendered pages or images into text; returns (text, unreadable_reason)."""
        if not settings.OCR_ENABLED:
            return None, "OCR_DISABLED"

        tessdata = cls._resolve_tessdata()
        if not tessdata:
            logger.warning("Tesseract OCR is unavailable: tessdata directory not found.")
            return None, "OCR_UNAVAILABLE"

        language = cls._select_ocr_language(tessdata, settings.OCR_LANGUAGE)
        if not language:
            logger.warning("Tesseract OCR has no usable traineddata in %s.", tessdata)
            return None, "OCR_UNAVAILABLE"

        try:
            ocr_parts = [cls._ocr_pixmap(pix, language, tessdata) for pix in pixmaps]
        except Exception:
            logger.warning("Tesseract OCR failed while parsing document.", exc_info=True)
            return None, "OCR_UNAVAILABLE"

        combined = "\n".join(ocr_parts).strip()
        if len(combined) < settings.CV_MIN_TEXT_CHARS:
            return None, "OCR_NO_TEXT"
        return combined, None

    @staticmethod
    def _call_ollama(model: str, user_prompt: str) -> ExtractedDocumentData:
        payload = {
            "model": model,
            "stream": False,
            "format": "json",
            "options": {"temperature": 0},
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
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

    @staticmethod
    def _current_date() -> date:
        return date.today()

    @staticmethod
    def _normalize_extracted_data(
        data: ExtractedDocumentData,
        reference_date: date,
        document_text: str | None = None,
    ) -> ExtractedDocumentData:
        """Normalize current milestones and strip fabricated Jan 1 dates on year-only certificates."""
        updated_milestones = []
        milestones_changed = False
        for milestone in data.work_milestones:
            if (
                not milestone.is_current
                and milestone.end_year == reference_date.year
                and milestone.end_month == reference_date.month
            ):
                updated_milestones.append(milestone.model_copy(update={"is_current": True}))
                milestones_changed = True
            else:
                updated_milestones.append(milestone)

        updated_certificates = []
        certificates_changed = False
        for cert in data.certificates:
            cert_updates: dict[str, date | None] = {}
            if (
                document_text is not None
                and cert.issued_date is not None
                and cert.issued_date.month == 1
                and cert.issued_date.day == 1
                and not _has_explicit_january_date(document_text, cert, cert.issued_date.year)
            ):
                cert_updates["issued_date"] = None
            if (
                document_text is not None
                and cert.expiry_date is not None
                and cert.expiry_date.month == 1
                and cert.expiry_date.day == 1
                and not _has_explicit_january_date(document_text, cert, cert.expiry_date.year)
            ):
                cert_updates["expiry_date"] = None

            if cert_updates:
                updated_certificates.append(cert.model_copy(update=cert_updates))
                certificates_changed = True
            else:
                updated_certificates.append(cert)

        updates: dict[str, object] = {}
        if milestones_changed:
            updates["work_milestones"] = updated_milestones
        if certificates_changed:
            updates["certificates"] = updated_certificates

        if not updates:
            return data
        return data.model_copy(update=updates)

    @classmethod
    def _extract_from_text(
        cls,
        evidence_type: str,
        text: str,
        *,
        is_image: bool = False,
        is_scanned: bool = False,
        is_ocr: bool = False,
    ) -> CvExtractResponse:
        today = cls._current_date()
        truncated_text = text[:_MAX_TEXT_CHARS]
        extracted = cls._call_ollama(
            settings.LLM_MODEL,
            build_text_extraction_prompt(
                evidence_type,
                truncated_text,
                is_ocr=is_ocr,
                reference_date=today,
            ),
        )
        normalized = cls._normalize_extracted_data(
            extracted,
            today,
            document_text=truncated_text,
        )
        return CvExtractResponse(
            status="EXTRACTED",
            is_image=is_image,
            is_scanned=is_scanned,
            extracted=normalized,
        )

    @classmethod
    def extract(cls, content: bytes, evidence_type: str) -> CvExtractResponse:
        """Parse a Gate 1 CV file to text (directly or via OCR) and extract fields via LLM."""
        normalized_group = evidence_type.strip().upper()

        kind = cls._detect_kind(content)
        if kind is None:
            return CvExtractResponse(
                status="UNREADABLE",
                is_unreadable=True,
                unreadable_reason="UNSUPPORTED_FILE_FORMAT",
            )

        if kind == "image":
            try:
                pix = pymupdf.Pixmap(content)
            except Exception:
                logger.info("Failed to open image CV for group %s", normalized_group)
                return CvExtractResponse(
                    status="UNREADABLE",
                    is_image=True,
                    is_unreadable=True,
                    unreadable_reason="CORRUPT_IMAGE",
                )

            ocr_text, reason = cls._ocr_pixmaps([pix])
            if reason or ocr_text is None:
                return CvExtractResponse(
                    status="UNREADABLE",
                    is_image=True,
                    is_unreadable=True,
                    unreadable_reason=reason,
                )

            return cls._extract_from_text(
                normalized_group,
                ocr_text,
                is_image=True,
                is_ocr=True,
            )

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
                return cls._extract_from_text(
                    normalized_group,
                    combined_text,
                    is_scanned=False,
                    is_ocr=False,
                )

            ocr_limit = min(doc.page_count, settings.CV_OCR_MAX_PAGES)
            rendered_pages = [
                doc[idx].get_pixmap(dpi=settings.OCR_DPI, alpha=False)
                for idx in range(ocr_limit)
            ]
            ocr_text, reason = cls._ocr_pixmaps(rendered_pages)
            if reason or ocr_text is None:
                return CvExtractResponse(
                    status="UNREADABLE",
                    is_scanned=True,
                    is_unreadable=True,
                    unreadable_reason=reason,
                )

            return cls._extract_from_text(
                normalized_group,
                ocr_text,
                is_scanned=True,
                is_ocr=True,
            )
