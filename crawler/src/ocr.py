"""
src/ocr.py
==========
OCR tiếng Việt cho PDF scan (không có text layer).

Văn bản trên vbpq.mof.gov.vn từ 2021 chỉ có PDF chụp ảnh bản ký, pdfplumber
trích được 0 ký tự -> render từng trang bằng pypdfium2 rồi đưa qua Tesseract.

Yêu cầu cài đặt (ngoài pip):
    Tesseract cho Windows (bản UB-Mannheim) + gói ngôn ngữ "vie".
    Đường dẫn tesseract.exe lấy từ config.TESSERACT_CMD (env TESSERACT_CMD).
"""

import shutil
import subprocess
from functools import lru_cache
from pathlib import Path
from typing import Optional

import config
from src.logger_setup import setup_logger

logger = setup_logger(__name__, config.LOG_DIR)


def _tesseract_cmd() -> Optional[str]:
    cmd = config.TESSERACT_CMD
    if cmd and Path(cmd).is_file():
        return cmd
    return shutil.which("tesseract")


@lru_cache(maxsize=1)
def availability_problem() -> Optional[str]:
    """None nếu OCR dùng được, ngược lại là lý do (để log hướng dẫn cài)."""
    try:
        import pypdfium2  # noqa: F401
        import pytesseract  # noqa: F401
    except ImportError as e:
        return f"thiếu thư viện Python ({e.name}) - chạy `pip install -r requirements.txt`"

    cmd = _tesseract_cmd()
    if not cmd:
        return (
            "chưa cài Tesseract - cài bản Windows của UB-Mannheim (kèm gói 'vie') "
            "hoặc đặt biến môi trường TESSERACT_CMD trỏ tới tesseract.exe"
        )
    try:
        langs = subprocess.run(
            [cmd, "--list-langs"], capture_output=True, text=True, timeout=30
        ).stdout.split()
    except Exception as e:
        return f"không chạy được Tesseract ({e})"
    if config.OCR_LANG not in langs:
        return f"Tesseract chưa có gói ngôn ngữ '{config.OCR_LANG}' (vie.traineddata)"
    return None


def ocr_pdf(pdf_path: str, max_pages: Optional[int] = None) -> str:
    """OCR toàn bộ (tối đa `max_pages`) trang của file PDF, trả về text nối theo trang."""
    import pypdfium2 as pdfium
    import pytesseract

    pytesseract.pytesseract.tesseract_cmd = _tesseract_cmd()
    max_pages = max_pages or config.OCR_MAX_PAGES
    scale = config.OCR_DPI / 72

    pdf = pdfium.PdfDocument(pdf_path)
    try:
        n_pages = len(pdf)
        if n_pages > max_pages:
            logger.warning(f"  OCR chỉ {max_pages}/{n_pages} trang đầu của {pdf_path}")
        pages = []
        for i in range(min(n_pages, max_pages)):
            image = pdf[i].render(scale=scale).to_pil()
            # psm 6: coi trang là 1 khối văn bản - giữ thứ tự dòng tốt cho văn bản hành chính
            pages.append(pytesseract.image_to_string(image, lang=config.OCR_LANG, config="--psm 6"))
            logger.debug(f"  OCR trang {i + 1}/{n_pages}")
    finally:
        pdf.close()
    return "\n".join(pages).strip()
