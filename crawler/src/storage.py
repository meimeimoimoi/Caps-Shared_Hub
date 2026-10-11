"""
src/storage.py
================
- Trích xuất text từ file PDF (khi trang HTML không có sẵn toàn văn)
- Lưu text ra file .txt
- Đọc/ghi/merge metadata.json (index tổng hợp toàn bộ văn bản đã cào)
"""

import json
from datetime import date
from pathlib import Path
from typing import List, Dict

import pdfplumber
from slugify import slugify

import config
from src.models import LegalDocument, record_key
from src.normalize import normalize_record, parse_vn_date
from src import ocr
from src.logger_setup import setup_logger

logger = setup_logger(__name__, config.LOG_DIR)


# ============================================================
# TRÍCH XUẤT TEXT TỪ PDF
# ============================================================

def extract_text_from_pdf(pdf_path: str) -> tuple[str, bool]:
    """
    Trích text từ file PDF bằng pdfplumber (chỉ hoạt động nếu PDF có text layer,
    tức là PDF được tạo từ văn bản số, KHÔNG phải ảnh scan thuần túy).

    Trả về tuple (text, ocr_required):
    - text: nội dung trích được (rỗng nếu không trích được gì)
    - ocr_required: True nếu nghi ngờ đây là PDF dạng ảnh scan (cần OCR ở bước
      sau, việc OCR nằm ngoài phạm vi tool này - xem PLAN.md phần rủi ro)
    """
    try:
        full_text_parts = []
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text() or ""
                full_text_parts.append(page_text)

        full_text = "\n\n".join(full_text_parts).strip()

        # Heuristic: nếu trích được quá ít ký tự so với số trang, khả năng cao
        # đây là PDF scan ảnh (không có text layer thật)
        num_pages = len(full_text_parts)
        avg_chars_per_page = len(full_text) / max(num_pages, 1)

        ocr_required = avg_chars_per_page < 50  # Ngưỡng kinh nghiệm, có thể chỉnh

        if ocr_required:
            logger.warning(
                f"  PDF '{pdf_path}' có vẻ là bản scan ảnh "
                f"(chỉ {avg_chars_per_page:.0f} ký tự/trang). Đánh dấu ocr_required=True."
            )

        return full_text, ocr_required

    except Exception as e:
        logger.error(f"  Lỗi trích text từ PDF '{pdf_path}': {e}")
        return "", True


def ensure_document_text(doc: LegalDocument) -> LegalDocument:
    """
    Đảm bảo doc.noi_dung_text có giá trị:
    1. Nếu đã có sẵn từ HTML (text_source == 'html_page') -> giữ nguyên, không làm gì thêm
    2. Nếu chưa có -> thử trích từ file PDF đã tải (ưu tiên file .pdf đầu tiên
       trong danh sách attachments đã download thành công)
    """
    if doc.noi_dung_text and doc.text_source in ("html_page", "detail_page_dom"):
        return doc

    pdf_attachment = next(
        (a for a in doc.attachments if a.downloaded and a.file_type in ("pdf", None) 
         and a.local_path and a.local_path.lower().endswith(".pdf")),
        None,
    )

    if pdf_attachment is None:
        logger.warning(
            f"[{doc.so_hieu}] Không có PDF nào tải thành công để trích text, "
            f"và trang HTML cũng không có sẵn toàn văn. noi_dung_text sẽ để trống."
        )
        doc.text_source = "unavailable"
        return doc

    logger.info(f"[{doc.so_hieu}] Đang trích text từ PDF: {pdf_attachment.local_path}")
    text, ocr_required = extract_text_from_pdf(pdf_attachment.local_path)

    doc.noi_dung_text = text
    doc.text_source = "pdf_extraction"
    doc.ocr_required = ocr_required

    if ocr_required and config.OCR_ENABLED:
        _ocr_document(doc, pdf_attachment.local_path)

    return doc


def _ocr_document(doc: LegalDocument, pdf_path: str) -> None:
    """PDF scan không có text layer -> OCR tiếng Việt (nếu đã cài Tesseract)."""
    problem = ocr.availability_problem()
    if problem:
        logger.warning(f"[{doc.so_hieu}] Cần OCR nhưng bỏ qua: {problem}")
        return
    try:
        text = ocr.ocr_pdf(pdf_path)
    except Exception as e:
        logger.error(f"[{doc.so_hieu}] OCR lỗi: {e}")
        return
    if text.strip():
        doc.noi_dung_text = text
        doc.text_source = "pdf_ocr"
        doc.ocr_required = False
        logger.info(f"[{doc.so_hieu}] OCR xong: {len(text):,} ký tự")


def save_text_file(doc: LegalDocument) -> None:
    """Lưu doc.noi_dung_text ra file .txt trong data/text/{loai_van_ban}/"""
    if not doc.noi_dung_text:
        logger.warning(f"[{doc.so_hieu}] Không có nội dung text để lưu.")
        return

    folder_name = config.get_folder_name(doc.loai_van_ban)
    so_hieu_slug = slugify(doc.so_hieu or "unknown", separator="-")
    dest_path = config.source_dir(config.TEXT_DIR, doc.source) / folder_name / f"{so_hieu_slug}.txt"
    dest_path.parent.mkdir(parents=True, exist_ok=True)

    # Ghi kèm 1 header nhỏ chứa metadata để file .txt tự thân đã có context
    # (hữu ích khi file này được đưa thẳng vào bước Parse & Normalize của Flow 2)
    header = (
        f"# {doc.tieu_de}\n"
        f"# Số hiệu: {doc.so_hieu}\n"
        f"# Loại văn bản: {doc.loai_van_ban}\n"
        f"# Cơ quan ban hành: {doc.co_quan_ban_hanh or 'N/A'}\n"
        f"# Ngày ban hành: {doc.ngay_ban_hanh or 'N/A'}\n"
        f"# Ngày hiệu lực: {doc.ngay_hieu_luc or 'N/A'}\n"
        f"# Tình trạng hiệu lực: {doc.tinh_trang_hieu_luc or 'N/A'}\n"
        f"# doc_id: {doc.doc_id or 'N/A'} ({doc.doc_id_type or 'N/A'})\n"
        f"# Nguồn: {doc.detail_url}\n"
        f"# ---\n\n"
    )

    dest_path.write_text(header + doc.noi_dung_text, encoding="utf-8")
    logger.info(f"[{doc.so_hieu}] Đã lưu text: {dest_path}")


# ============================================================
# METADATA.JSON - INDEX TỔNG HỢP
# ============================================================

def load_existing_metadata() -> Dict[str, dict]:
    """
    Đọc metadata.json hiện có (nếu tồn tại), trả về dict {unique_key: doc_dict}
    để dễ merge/chống trùng theo key.

    Khóa phải KHỚP với `LegalDocument.unique_key`:
      - ưu tiên `id::<doc_id>` (định danh duy nhất của vbpl.vn)
      - nếu bản ghi cũ không có doc_id -> `loai_van_ban::so_hieu`
    """
    if not config.METADATA_FILE.exists():
        return {}

    try:
        with open(config.METADATA_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)

        out: Dict[str, dict] = {}
        for item in data:
            if not isinstance(item, dict):
                continue
            out[record_key(item)] = item
        return out

    except Exception as e:
        logger.error(f"Lỗi đọc metadata.json hiện có: {e}. Sẽ tạo mới.")
        return {}


def _migrate_placeholder_urls(records: Dict[str, dict]) -> int:
    """
    Chuẩn hóa các bản ghi cũ từ các lần chạy trước: `detail_url` từng bị ghi
    thành "URL_NOT_FOUND" vì không lấy được id. Nếu bản ghi đó vẫn còn
    `detail_url_requested` hợp lệ thì khôi phục lại để index không bị dữ liệu rác.
    """
    fixed = 0
    for rec in records.values():
        url = (rec.get("detail_url") or "").strip()
        if url in ("URL_NOT_FOUND", "", None):
            candidate = (rec.get("detail_url_requested") or "").strip()
            if candidate.startswith("http") and "/chi-tiet/" in candidate:
                rec["detail_url"] = candidate
                fixed += 1
    return fixed


def purge_invalid_metadata() -> int:
    """
    Xoá các bản ghi "chết" do các lần chạy cũ để lại: không có `doc_id`, không
    có `detail_url` hợp lệ, không có text và không tải được file nào.

    Đây chính là các dòng `detail_url: "URL_NOT_FOUND"` từ trước khi pipeline
    biết cách lấy id từ server action - chúng không có giá trị sử dụng và chỉ
    làm nhiễu index.

    Trả về số bản ghi đã xoá.
    """
    records = load_existing_metadata()
    if not records:
        return 0

    dead = []
    for key, rec in records.items():
        url = (rec.get("detail_url") or "").strip()
        has_url = url.startswith("http")
        has_id = bool(rec.get("doc_id"))
        has_text = bool((rec.get("noi_dung_text") or "").strip())
        has_file = any(
            a.get("downloaded") and a.get("local_path")
            for a in (rec.get("attachments") or [])
        )
        if not (has_url or has_id or has_text or has_file):
            dead.append(key)

    if not dead:
        return 0

    for key in dead:
        del records[key]

    with open(config.METADATA_FILE, "w", encoding="utf-8") as f:
        json.dump(list(records.values()), f, ensure_ascii=False, indent=2)

    logger.info(f"Đã xoá {len(dead)} bản ghi không có id/URL/text/file khỏi metadata.json.")
    return len(dead)


def _sort_key(rec: dict):
    # Theo loại văn bản, rồi ngày ban hành (parse thật, không so chuỗi DD/MM/YYYY)
    issued = parse_vn_date(rec.get("ngay_ban_hanh"))
    return (rec.get("loai_van_ban", ""), issued is not None, issued or date.min)


def write_metadata_records(records: List[dict]) -> List[dict]:
    """Chuẩn hoá (số hiệu, file đính kèm), sắp xếp rồi ghi đè metadata.json."""
    records = [normalize_record(rec) for rec in records]
    # Mới nhất lên đầu; văn bản không rõ ngày nằm cuối mỗi nhóm loại
    records.sort(key=_sort_key, reverse=True)

    config.METADATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(config.METADATA_FILE, "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, indent=2)
    return records


def save_metadata(documents: List[LegalDocument]) -> None:
    """
    Merge danh sách `documents` mới cào được vào metadata.json hiện có
    (không ghi đè các văn bản cũ không liên quan đến lần chạy này), dùng
    `unique_key` (ưu tiên `doc_id`) làm khóa chống trùng.
    """
    existing = load_existing_metadata()

    n_fixed = _migrate_placeholder_urls(existing)
    if n_fixed:
        logger.info(f"Đã khôi phục detail_url cho {n_fixed} bản ghi cũ bị URL_NOT_FOUND.")

    n_new = 0
    for doc in documents:
        key = doc.unique_key
        if key not in existing:
            n_new += 1
        existing[key] = doc.to_dict()

    merged_list = write_metadata_records(list(existing.values()))

    logger.info(
        f"Đã lưu metadata.json: {n_new} văn bản mới, "
        f"{len(documents) - n_new} văn bản cập nhật, "
        f"tổng cộng {len(merged_list)} văn bản trong index."
    )
