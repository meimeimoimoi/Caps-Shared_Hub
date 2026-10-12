"""
src/models.py
=============
Định nghĩa cấu trúc dữ liệu (data class) dùng xuyên suốt pipeline scraper.
"""

from dataclasses import dataclass, field, asdict
from typing import Optional, List
from datetime import datetime


@dataclass
class Attachment:
    """Một file đính kèm (PDF/DOC) của văn bản pháp luật."""

    file_name: str                     # Tên file gốc trên server, vd: "78.2014.TT.BTC.pdf"
    source_url: str                    # URL đầy đủ trên vbpl.vn để tải file
    local_path: Optional[str] = None   # Đường dẫn local sau khi tải thành công
    file_type: Optional[str] = None    # "pdf" | "doc" | "docx"
    downloaded: bool = False
    download_error: Optional[str] = None

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class LegalDocument:
    """Một văn bản pháp luật hoàn chỉnh, gồm metadata + nội dung + file đính kèm."""

    # --- Thông tin định danh ---
    so_hieu: str                            # Số ký hiệu, vd: "78/2014/TT-BTC"
    tieu_de: str                            # Tiêu đề / trích yếu đầy đủ
    loai_van_ban: str                       # "Thông tư", "Nghị định", "Luật", "Quyết định"...

    # --- Thông tin ban hành ---
    co_quan_ban_hanh: Optional[str] = None
    ngay_ban_hanh: Optional[str] = None     # Định dạng "DD/MM/YYYY" (giữ nguyên như trang gốc)
    ngay_hieu_luc: Optional[str] = None
    ngay_het_hieu_luc: Optional[str] = None
    tinh_trang_hieu_luc: Optional[str] = None  # "Còn hiệu lực" | "Hết hiệu lực" | ...

    # --- Định danh & liên kết nguồn ---
    doc_id: Optional[str] = None            # ID văn bản trên vbpl.vn (UUID hoặc số)
    doc_id_type: Optional[str] = None       # "uuid" | "numeric" | "other"
    detail_url: str = ""                    # URL trang chi tiết - URL THỰC SỰ tool đã vào
    detail_url_requested: Optional[str] = None  # URL tool dựng ra từ doc_id trước khi điều hướng
    search_url: Optional[str] = None        # Trang tìm kiếm đã dùng để phát hiện văn bản này

    # --- Nội dung ---
    noi_dung_text: Optional[str] = None     # Toàn văn text đã trích xuất
    text_source: Optional[str] = None       # "html_page" | "pdf_extraction" | "ocr_required"

    # --- File đính kèm ---
    attachments: List[Attachment] = field(default_factory=list)

    # --- Metadata quản trị nội bộ (không thuộc về vbpl.vn) ---
    scraped_at: str = field(default_factory=lambda: datetime.now().isoformat())
    ocr_required: bool = False               # True nếu PDF là ảnh scan, không trích được text
    error: Optional[str] = None              # Ghi lại lỗi nếu có phát sinh trong quá trình xử lý
    source: str = "vbpl"                     # Nguồn cào: "vbpl" (vbpl.vn) | "mof" (vbpq.mof.gov.vn)
    # Chế độ --keywords-file: những từ khoá / nhóm đã tìm ra văn bản này
    matched_keywords: List[str] = field(default_factory=list)
    keyword_groups: List[str] = field(default_factory=list)

    def add_keyword(self, term: str, group: str) -> None:
        if term not in self.matched_keywords:
            self.matched_keywords.append(term)
        if group not in self.keyword_groups:
            self.keyword_groups.append(group)

    def to_dict(self) -> dict:
        d = asdict(self)
        d["attachments"] = [a.to_dict() if isinstance(a, Attachment) else a for a in self.attachments]
        return d

    @property
    def unique_key(self) -> str:
        return record_key(self.to_dict())


def record_key(rec: dict) -> str:
    """
    Khóa duy nhất dùng để chống trùng lặp khi merge vào metadata.json.

    Ưu tiên doc_id (định danh của trang nguồn); thiếu thì lùi về (loại văn bản +
    số hiệu). Mỗi nguồn giữ bản ghi riêng: vbpl.vn giữ khoá cũ `id::<doc_id>` để
    tương thích metadata đã có, nguồn khác thêm tiền tố `<source>::`.
    """
    doc_id = rec.get("doc_id")
    key = f"id::{doc_id}" if doc_id else f"{rec.get('loai_van_ban', '')}::{rec.get('so_hieu', '')}"
    source = rec.get("source") or "vbpl"
    return key if source == "vbpl" else f"{source}::{key}"


@dataclass
class SearchResultItem:
    """
    Kết quả thô lấy được từ trang tìm kiếm (trước khi vào trang chi tiết).

    `api_item` là dict raw do server vbpl.vn trả về - chứa sẵn hầu hết metadata
    (id, docNum, docType, issueDate, effFrom, agencyName, documentRelatedList...)
    nên không cần gọi lại trang chi tiết để lấy metadata.
    """

    title: str
    detail_url: str
    date_hint: Optional[str] = None   # Ngày ban hành hiển thị nhanh trên list (chưa chắc chắn 100%)
    doc_type: Optional[str] = None    # Loại văn bản đang lọc khi lấy kết quả này

    # --- Định danh & URL ---
    doc_id: Optional[str] = None            # ID văn bản để dựng URL /van-ban/chi-tiet/{id}
    doc_id_type: Optional[str] = None       # "uuid" | "numeric" | "other"
    requested_url: Optional[str] = None     # URL dựng từ doc_id
    visited_url: Optional[str] = None       # URL THỰC SỰ trình duyệt đã vào (page.url)
    search_url: Optional[str] = None        # Trang tìm kiếm đã dùng

    # --- Dữ liệu thô từ server ---
    api_item: Optional[dict] = None         # Dict raw trong items[] của server action
    api_detail: Optional[dict] = None       # Metadata đầy đủ lấy từ server action trang chi tiết
    full_text: Optional[str] = None         # Toàn văn text lấy được ở trang chi tiết

    # Tiêu đề đọc từ DOM (thẻ <h1> trang chi tiết). Ưu tiên hơn tiêu đề trong
    # api_item vì payload server đi qua CDP bị hỏng 1 số byte tiếng Việt
    # (ví dụ byte 0x81 của chữ "ề" không tồn tại trong cp1252 nên mất vĩnh viễn),
    # còn DOM thì luôn đúng.
    dom_title: Optional[str] = None

    # --- Kết quả tải file ---
    downloaded_path: Optional[str] = None   # File đầu tiên tải thành công (giữ tương thích cũ)
    downloaded_paths: List[str] = field(default_factory=list)  # Tất cả file đã tải
    download_error: Optional[str] = None
