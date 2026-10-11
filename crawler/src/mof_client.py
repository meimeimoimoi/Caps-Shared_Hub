"""
src/mof_client.py
=================
Cào văn bản từ vbpq.mof.gov.vn - CSDL văn bản quy phạm pháp luật ngành tài chính
(menu "Hệ thống văn bản" của mof.gov.vn trỏ sang trang này).

Khác vbpl.vn, trang này có API JSON công khai nên chỉ cần `requests`:
    GET  /api/legaldoc/DocumentType/GetAll          -> [{id, name}]
    POST /api/legaldoc/Search/POSTSearchQuery       -> {documents[], totalItem}
    GET  /DKC.FileManagement/FileStorage/File/{id}  -> file đính kèm (PDF)

Trang không có toàn văn dạng text (trường `toanVan` chỉ là 1 câu, không tin
được) -> toàn văn lấy từ PDF; bản từ 2021 là PDF scan nên cần OCR (src/ocr.py).

Tìm theo `QueryText` của server rất lỏng (khớp từng từ), nên tool tự lọc lại:
chỉ giữ văn bản có trích yếu chứa nguyên cụm từ khoá.
"""

import random
import re
import time
from pathlib import Path
from typing import Dict, Iterator, List, Optional, Set

import requests
from slugify import slugify

import config
from src.detail_scraper import _fmt_date
from src.logger_setup import setup_logger
from src.models import Attachment, LegalDocument
from src.normalize import doc_number_key

logger = setup_logger(__name__, config.LOG_DIR)

SOURCE = "mof"
SEARCH_PATH = "/api/legaldoc/Search/POSTSearchQuery"
DOC_TYPES_PATH = "/api/legaldoc/DocumentType/GetAll"
FILE_URL = config.MOF_BASE_URL + "/DKC.FileManagement/FileStorage/File/{file_id}"
DETAIL_URL = config.MOF_BASE_URL + "/Detail?contentType=LegalDocument&id={doc_id}&tab=99"
# Bộ lọc "Văn bản quy phạm pháp luật" của trang chủ (lấy từ request thật của trình duyệt)
CONTENT_TYPE_ID = 5


def _delay() -> None:
    time.sleep(random.uniform(config.DELAY_MIN_SECONDS, config.DELAY_MAX_SECONDS))


def _norm(text: Optional[str]) -> str:
    return re.sub(r"\s+", " ", (text or "")).strip().casefold()


def summary_matches(summary: Optional[str], keyword: Optional[str]) -> bool:
    """Trích yếu chứa nguyên cụm từ khoá (không phân biệt hoa thường); từ khoá rỗng = khớp tất."""
    kw = _norm(keyword)
    return not kw or kw in _norm(summary)


def _session() -> requests.Session:
    s = requests.Session()
    s.headers.update(config.REQUEST_HEADERS)
    s.headers.update({"Origin": config.MOF_BASE_URL, "Referer": config.MOF_BASE_URL + "/"})
    # Lấy cookie load balancer trước khi gọi API (thiếu cookie đôi khi bị 500)
    s.get(config.MOF_BASE_URL + "/", timeout=config.REQUEST_TIMEOUT)
    return s


def _doc_type_ids(s: requests.Session) -> Dict[str, int]:
    r = s.get(config.MOF_BASE_URL + DOC_TYPES_PATH, timeout=config.REQUEST_TIMEOUT)
    r.raise_for_status()
    return {str(t["name"]).strip(): int(t["id"]) for t in r.json() if t.get("name")}


def _search_pages(
    s: requests.Session, keyword: str, type_id: int, type_name: str,
    max_pages: Optional[int] = None,
) -> Iterator[dict]:
    """Duyệt kết quả tìm kiếm (mới nhất trước) từng trang, tối đa MOF_MAX_PAGES."""
    page = 1
    while max_pages is None or page <= max_pages:
        body = {
            "QueryText": keyword or "",
            "Page": page,
            "PageSize": config.MOF_PAGE_SIZE,
            "ContentType": "LegalDocument",
            "ContentTypeId": CONTENT_TYPE_ID,
            "DocumentType": {"id": type_id, "name": type_name},
            # Server lỗi nếu thiếu các bộ lọc rỗng này
            "Organization": {}, "Editor": {}, "DocumentStatus": {}, "Field": {},
            "DocumentTypeForbidden": {},
        }
        r = s.post(config.MOF_BASE_URL + SEARCH_PATH, json=body, timeout=config.REQUEST_TIMEOUT)
        r.raise_for_status()
        data = r.json()
        docs = data.get("documents") or []
        logger.info(f"  [{type_name}] trang {page}: {len(docs)} kết quả (tổng {data.get('totalItem')})")
        yield from docs
        if len(docs) < config.MOF_PAGE_SIZE:
            return
        total = data.get("totalItem")
        if isinstance(total, int) and page * config.MOF_PAGE_SIZE >= total:
            return
        _delay()
        page += 1


def to_legal_document(item: dict) -> LegalDocument:
    """Map 1 phần tử `documents[]` của API sang LegalDocument (source="mof")."""
    doc_id = str(item.get("id"))
    loai = (item.get("documentTypeRecordName") or "").strip() or "Không xác định"
    so_hieu = (item.get("no") or "").strip() or "UNKNOWN"
    summary = (item.get("summary") or "").strip()
    orgs = [o.get("name") for o in item.get("organizations") or [] if o.get("name")]
    detail_url = DETAIL_URL.format(doc_id=doc_id)

    attachments = [
        Attachment(
            file_name=(f.get("inputFileName") or f"file-{f.get('id')}").strip(),
            source_url=FILE_URL.format(file_id=f.get("id")),
            file_type=((f.get("inputFileName") or "").rsplit(".", 1)[-1].lower() or None),
        )
        for f in item.get("filePathCurrent") or []
        if f.get("id")
    ]

    return LegalDocument(
        so_hieu=so_hieu,
        tieu_de=f"{loai} {so_hieu} {summary}".strip(),
        loai_van_ban=loai,
        co_quan_ban_hanh=", ".join(dict.fromkeys(orgs)) or None,
        ngay_ban_hanh=_fmt_date(item.get("legalPublishDate")),
        ngay_hieu_luc=_fmt_date(item.get("legalApplyDate")),
        ngay_het_hieu_luc=_fmt_date(item.get("legalExpireDate")),
        tinh_trang_hieu_luc=item.get("documentStatusRecordName"),
        doc_id=doc_id,
        doc_id_type="numeric",
        detail_url=detail_url,
        detail_url_requested=detail_url,
        search_url=config.MOF_BASE_URL + SEARCH_PATH,
        attachments=attachments,
        source=SOURCE,
    )


def _dest_path(doc: LegalDocument, file_name: str) -> Path:
    folder = config.get_folder_name(doc.loai_van_ban)
    slug = slugify(doc.so_hieu or "unknown", separator="-") or "unknown"
    # Tên file trên vbpq có thể chứa "/" (vd "65/2026/TT-BTC.pdf")
    safe_name = re.sub(r'[<>:"/\\|?*\x00-\x1f]', "_", file_name).strip() or "file"
    dest = config.source_dir(config.PDF_DIR, SOURCE) / folder / f"{slug}__{safe_name}"
    dest.parent.mkdir(parents=True, exist_ok=True)
    return dest


def _download_attachments(s: requests.Session, doc: LegalDocument, sizes: Dict[str, int]) -> None:
    max_bytes = config.MOF_MAX_FILE_MB * 1024 * 1024
    for att in doc.attachments:
        if att.file_type not in ("pdf", "doc", "docx"):
            continue  # .rar, ảnh...: không trích được text
        if sizes.get(att.source_url, 0) > max_bytes:
            att.download_error = f"file lớn hơn {config.MOF_MAX_FILE_MB}MB"
            continue
        dest = _dest_path(doc, att.file_name)
        try:
            with s.get(att.source_url, stream=True, timeout=config.REQUEST_TIMEOUT) as r:
                r.raise_for_status()
                with open(dest, "wb") as f:
                    for chunk in r.iter_content(chunk_size=1 << 16):
                        f.write(chunk)
            att.local_path = str(dest)
            att.downloaded = True
            logger.info(f"    Tải: {dest.name}")
        except Exception as e:
            att.download_error = str(e)
            logger.warning(f"    Lỗi tải {att.file_name}: {e}")
        _delay()


def collect_mof_documents(
    keyword: str,
    doc_types: List[str],
    top_n: Optional[int],
    skip_download: bool = False,
    known_numbers: Optional[Set[str]] = None,
) -> List[LegalDocument]:
    """
    Tìm top-N văn bản mới nhất mỗi loại có trích yếu chứa `keyword`, tải file đính kèm.

    `known_numbers`: tập `doc_number_key` đã có từ vbpl.vn -> văn bản trùng số hiệu
    bị bỏ qua trước khi tải file/OCR và không tính vào top-N.
    """
    known_numbers = known_numbers or set()
    s = _session()
    type_ids = _doc_type_ids(s)
    documents: List[LegalDocument] = []
    seen = set()

    for type_name in doc_types:
        type_id = type_ids.get(type_name)
        if type_id is None:
            logger.warning(f"[mof] vbpq.mof.gov.vn không có loại văn bản '{type_name}' - bỏ qua")
            continue

        picked = 0
        max_pages = None if top_n is None else config.MOF_MAX_PAGES
        for item in _search_pages(s, keyword, type_id, type_name, max_pages=max_pages):
            if top_n is not None and picked >= top_n:
                break
            if item.get("id") in seen or not summary_matches(item.get("summary"), keyword):
                continue
            seen.add(item.get("id"))
            if doc_number_key(item.get("no")) in known_numbers:
                logger.info(f"[mof] Bỏ qua {item.get('no')}: trùng số hiệu với vbpl.vn")
                continue
            doc = to_legal_document(item)
            logger.info(f"[mof] {doc.so_hieu} | {doc.tieu_de[:80]}")
            if not skip_download:
                sizes = {
                    FILE_URL.format(file_id=f.get("id")): int(f.get("length") or 0)
                    for f in item.get("filePathCurrent") or []
                }
                _download_attachments(s, doc, sizes)
            documents.append(doc)
            picked += 1

        if top_n is not None and picked < top_n:
            logger.warning(
                f"[mof] '{type_name}': chỉ tìm được {picked}/{top_n} văn bản có trích yếu chứa "
                f"'{keyword}' trong {config.MOF_MAX_PAGES} trang đầu"
            )
        _delay()

    return documents
