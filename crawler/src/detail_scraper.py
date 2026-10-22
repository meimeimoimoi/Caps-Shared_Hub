"""
src/detail_scraper.py
=====================
Chuyển dữ liệu đã thu thập ở bước tìm kiếm thành đối tượng LegalDocument hoàn chỉnh.

VÌ SAO KHÔNG DÙNG `requests` Ở ĐÂY?
----------------------------------
Bản cập nhật của vbpl.vn (Next.js App Router) trả về HTTP 403 cho client
không phải trình duyệt, và kể cả khi trả 200 thì HTML cũng không chứa nội dung
(toàn văn, metadata, file đính kèm đều tải qua Server Action bằng JavaScript).

→ Vì vậy mọi dữ liệu đã được `search_client.py` bắt trong lúc điều hướng thật:
    - `item.api_item`   : object văn bản trong `items[]` của server action tìm kiếm
                         (chứa id, docNum, docType, ngày ban hành, agencyName,
                         documentRelatedList = danh sách file đính kèm)
    - `item.api_detail` : metadata đầy đủ hơn từ server action trang chi tiết
    - `item.full_text`  : toàn văn (text đã render trong DOM, hoặc HTML thô)
    - `item.visited_url`: URL thực sự trình duyệt đã vào

Module này chỉ cần map các trường đó sang `LegalDocument` — không cần mạng.
"""

import re
from datetime import datetime
from typing import Any, Dict, List, Optional

from bs4 import BeautifulSoup

import config
from src.logger_setup import setup_logger
from src.models import Attachment, LegalDocument, SearchResultItem
from src.normalize import resolve_so_hieu
from src.references import doc_type_for_number
from src.rsc import fix_mojibake, is_mojibake

logger = setup_logger(__name__, config.LOG_DIR)

# Đuôi file cần giữ lại từ documentRelatedList
_ATTACHMENT_EXT_RE = re.compile(r"\.(pdf|doc|docx)$", re.IGNORECASE)

# relatedType trong documentRelatedList:
#   1 = file pdf gốc, 2 = file đính kèm (doc/docx), 5 = nội dung html,
#   6 = nội dung gốc html, 7 = ảnh. Chỉ giữ loại file tải về được.
_ATTACHMENT_RELATED_TYPES = {"1", "2"}


# ============================================================
#  Chuẩn hóa dữ liệu thô
# ============================================================

def _fmt_date(value: Any) -> Optional[str]:
    """
    Chuẩn hóa ngày về định dạng "DD/MM/YYYY" (giống hệt trang vbpl.vn hiển thị).

    Server trả về ISO: "2008-07-04T00:00:00" hoặc "2008-07-04".
    """
    if not value:
        return None
    text = str(value).strip()
    if not text:
        return None

    # Đã đúng định dạng DD/MM/YYYY
    if re.fullmatch(r"\d{2}/\d{2}/\d{4}", text):
        return text

    m = re.match(r"(\d{4})-(\d{2})-(\d{2})", text)
    if m:
        return f"{m.group(3)}/{m.group(2)}/{m.group(1)}"

    return text


def _clean_agency(agency_name: Optional[str]) -> Optional[str]:
    """
    Làm sạch tên cơ quan ban hành.

    Server trả về cùng tên nhiều lần: "Bộ Tài chính, Bộ Tài chính, Bộ Tài chính"
    (do join nhiều bản ghi agency) -> chỉ giữ 1 tên duy nhất.
    """
    if not agency_name:
        return None
    parts = [p.strip() for p in str(agency_name).split(",") if p.strip()]
    if not parts:
        return None
    # Giữ thứ tự, bỏ trùng lặp
    seen = set()
    uniq = []
    for p in parts:
        if p.lower() not in seen:
            seen.add(p.lower())
            uniq.append(p)
    return ", ".join(uniq)


def _doc_type_name(item: SearchResultItem) -> Optional[str]:
    """
    Lấy tên loại văn bản.

    Ưu tiên tên do server trả về (chính xác nhất, ví dụ lọc "Thông tư" thì
    server trả "Thông tư liên tịch"), nhưng nếu tên đó bị hỏng encoding
    (chứa U+FFFD hoặc ký tự mojibake) thì lùi về loại mà người dùng yêu cầu
    lọc - biến đó luôn sạch vì đến từ CLI, không đi qua payload.
    """
    for src in (item.api_detail, item.api_item):
        if isinstance(src, dict):
            dt = src.get("docType")
            if isinstance(dt, dict) and dt.get("name"):
                name = str(dt["name"]).strip()
                if name and not is_mojibake(name):
                    return name

    return item.doc_type


def _field(src: Optional[dict], *keys: str) -> Optional[str]:
    """Lấy giá trị đầu tiên có giá trị trong dict `src` theo danh sách key."""
    if not isinstance(src, dict):
        return None
    for k in keys:
        v = src.get(k)
        if v not in (None, "", []):
            return v
    return None


# ============================================================
#  File đính kèm
# ============================================================

def _build_attachments(item: SearchResultItem) -> List[Attachment]:
    """
    Dựng danh sách file đính kèm từ `documentRelatedList` của server,
    khớp với các file đã tải thành công.

    Ví dụ documentRelatedList:
        [{"id":"977e...", "fileName":"58_2008_TTLT-BTC-BTNMT.doc",
          "relatedType":"2", "fileTitle":"58_2008_TTLT-BTC-BTNMT.doc"}, ...]
    """
    api = item.api_detail if isinstance(item.api_detail, dict) else (item.api_item or {})
    related = api.get("documentRelatedList") or []

    # Index các file đã tải theo tên file (không phân biệt hoa thường)
    downloaded_by_name = {}
    for path_str in item.downloaded_paths:
        p = path_str.replace("\\", "/").split("/")[-1]
        # Bỏ tiền tố "<slug>__" mà scraper thêm vào tên file lưu
        orig = p.split("__", 1)[1] if "__" in p else p
        downloaded_by_name[orig.casefold()] = path_str
        downloaded_by_name[p.casefold()] = path_str

    attachments: List[Attachment] = []
    seen = set()

    for rel in related:
        if not isinstance(rel, dict):
            continue
        # Tên file trong documentRelatedList cũng đi qua lớp decode lỗi của
        # CDP, ví dụ "Nghị-định-362-2026-N�Ð-CP.docx" -> phải sửa trước khi so
        # khớp với tên file Playwright tải về (tên đó luôn đúng).
        file_name = fix_mojibake((rel.get("fileName") or "").strip())
        if not file_name or not _ATTACHMENT_EXT_RE.search(file_name):
            continue

        related_type = str(rel.get("relatedType") or "")
        if related_type and related_type.isdigit() and related_type not in _ATTACHMENT_RELATED_TYPES:
            continue

        key = file_name.casefold()
        if key in seen:
            continue
        seen.add(key)

        local = downloaded_by_name.get(key)
        attachments.append(
            Attachment(
                file_name=file_name,
                # Server không trả URL file riêng; file được tải qua UI trang chi tiết
                source_url=item.visited_url or item.requested_url or "",
                local_path=local,
                file_type=file_name.rsplit(".", 1)[-1].lower(),
                downloaded=bool(local),
            )
        )

    # Trường hợp tải được file nhưng server không liệt kê (hiếm) -> vẫn ghi lại
    listed = {a.file_name.casefold() for a in attachments}
    for path_str in item.downloaded_paths:
        p = path_str.replace("\\", "/").split("/")[-1]
        orig = fix_mojibake(p.split("__", 1)[1] if "__" in p else p)
        if orig.casefold() in listed:
            continue
        listed.add(orig.casefold())
        attachments.append(
            Attachment(
                file_name=orig,
                source_url=item.visited_url or item.requested_url or "",
                local_path=path_str,
                file_type=orig.rsplit(".", 1)[-1].lower() if "." in orig else None,
                downloaded=True,
            )
        )

    return attachments


# ============================================================
#  Toàn văn
# ============================================================

def _html_to_text(html_or_text: Optional[str]) -> Optional[str]:
    """
    Chuyển toàn văn (HTML thô hoặc text đã render) thành text sạch.

    Nếu đầu vào là HTML (chứa thẻ <p>, <br>, <div>) thì bóc tách bằng BeautifulSoup
    để giữ ngắt dòng theo đoạn văn; nếu đã là text thì giữ nguyên.
    """
    if not html_or_text:
        return None

    text = html_or_text.strip()
    if not text:
        return None

    looks_like_html = bool(re.search(r"<\s*(p|div|br|html|body|table)\b", text[:2000], re.I))
    if not looks_like_html:
        return text if len(text) > 200 else (text or None)

    soup = BeautifulSoup(text, "lxml")
    for tag in soup(["script", "style"]):
        tag.decompose()

    # <br> -> xuống dòng, rồi lấy text theo từng khối
    for br in soup.find_all("br"):
        br.replace_with("\n")
    raw = soup.get_text("\n")

    lines = [ln.strip() for ln in raw.splitlines()]
    lines = [ln for ln in lines if ln and ln not in ("\xa0", "&nbsp;")]

    out = "\n".join(lines).strip()
    return out or None


# ============================================================
#  Hàm chính
# ============================================================

def scrape_document_detail(item: SearchResultItem) -> LegalDocument:
    """
    Điểm vào chính của module: nhận 1 SearchResultItem đã có dữ liệu từ bước tìm
    kiếm, trả về LegalDocument hoàn chỉnh.

    Không gọi mạng - mọi thứ đã được search_client.py thu thập khi điều hướng
    vào trang tài liệu.
    """
    search_item = item.api_item if isinstance(item.api_item, dict) else {}
    detail_item = item.api_detail if isinstance(item.api_detail, dict) else {}

    logger.info(f"Đang dựng metadata: {item.title[:70]}... (id={item.doc_id})")

    doc = LegalDocument(
        so_hieu="",
        # Ưu tiên tiêu đề đọc từ DOM (<h1>): payload server action đôi khi mất
        # byte tiếng Việt (byte cp1252 không tồn tại) nên tiêu đề từ API có thể
        # chứa ký tự hỏng. DOM luôn đúng.
        tieu_de=(
            item.dom_title
            or _field(detail_item, "title")
            or item.title
            or ""
        ).strip(),
        loai_van_ban=_doc_type_name(item) or "Không xác định",
        # --- URL: đây là URL THỰC SỰ tool đã vào ---
        detail_url=item.visited_url or item.requested_url or item.detail_url,
        doc_id=item.doc_id,
        doc_id_type=item.doc_id_type,
        detail_url_requested=item.requested_url,
        search_url=item.search_url,
    )

    # --- Số hiệu ---
    doc.so_hieu = (
        _field(detail_item, "docNum")
        or _field(search_item, "docNum")
        or ""
    )
    doc.so_hieu = re.split(r"[(\n]", str(doc.so_hieu).strip())[0].strip()
    # docNum từ payload có thể mất byte chữ "Đ" ("N�\x90-CP"): sửa hoặc lấy từ tiêu đề DOM
    doc.so_hieu = resolve_so_hieu(doc.so_hieu, doc.tieu_de)
    if doc.so_hieu == "UNKNOWN":
        logger.warning(f"  -> Khong lay duoc 'So ky hieu' cho id={item.doc_id}.")
    # Docs fetched by id (related docs) have no search filter type to fall back on
    if doc.loai_van_ban == "Không xác định":
        doc.loai_van_ban = doc_type_for_number(doc.so_hieu) or doc.loai_van_ban

    # --- Thông tin ban hành ---
    doc.co_quan_ban_hanh = _clean_agency(
        _field(detail_item, "agencyName") or _field(search_item, "agencyName")
    )
    doc.ngay_ban_hanh = _fmt_date(
        _field(detail_item, "issueDate") or _field(search_item, "issueDate")
    )
    doc.ngay_hieu_luc = _fmt_date(
        _field(detail_item, "effFrom") or _field(search_item, "effFrom")
    )
    doc.ngay_het_hieu_luc = _fmt_date(
        _field(detail_item, "effTo") or _field(search_item, "effTo")
    )

    eff_status = _field(detail_item, "effStatus") or _field(search_item, "effStatus")
    if isinstance(eff_status, dict):
        doc.tinh_trang_hieu_luc = eff_status.get("name")
    elif eff_status:
        doc.tinh_trang_hieu_luc = str(eff_status)

    # --- Toàn văn ---
    text = _html_to_text(item.full_text)
    if text:
        doc.noi_dung_text = text
        # Phân biệt nguồn: HTML thô từ server vs text đã render trong DOM
        doc.text_source = (
            "html_page" if re.search(r"<\s*(p|div|html)\b", (item.full_text or "")[:500], re.I)
            else "detail_page_dom"
        )
        logger.info(f"  -> Lay duoc {len(text):,} ky tu toan van.")
    else:
        doc.text_source = "unavailable"
        logger.warning(f"  -> Khong lay duoc toan van (id={item.doc_id}).")

    # --- File đính kèm ---
    doc.attachments = _build_attachments(item)
    n_dl = sum(1 for a in doc.attachments if a.downloaded)
    logger.info(f"  -> {len(doc.attachments)} file dinh kem ({n_dl} da tai).")

    doc.relations = list(item.relations or [])
    doc.vbhn = list(item.vbhn or [])

    # --- Lỗi ---
    if item.download_error and n_dl == 0:
        doc.error = item.download_error

    return doc


# ============================================================
#  Fallback: dựng metadata từ HTML (nếu sau này vbpl.vn render server-side)
# ============================================================
# Hiện tại không dùng vì trang là SPA (requests bị 403). Nếu vbpl.vn đổi kiểu
# render, có thể gọi lại hàm dưới đây với HTML đã tải về:
#
# def scrape_document_detail_from_html(html: str, detail_url: str) -> LegalDocument:
#     soup = BeautifulSoup(html, "lxml")
#     ...
