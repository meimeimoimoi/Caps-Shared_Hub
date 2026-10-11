"""
src/normalize.py
================
Chuẩn hoá bản ghi trước khi lưu vào metadata.json / xuất cho Caps-Shared_Hub.

Dùng chung cho cả 2 đường:
- lúc cào (`save_metadata` gọi `normalize_record` cho mọi bản ghi)
- `--export-only` (sửa lại các bản ghi cũ đã nằm trong metadata.json)

Mọi hàm làm việc trên dict (dạng đã `to_dict()`), không gọi mạng.
"""

import re
from datetime import date
from pathlib import Path
from typing import Optional

from src.rsc import fix_mojibake, is_mojibake

# Payload server action của vbpl.vn làm mất byte đầu (0xC4) của chữ "Đ"/"đ"
# (UTF-8: C4 90 / C4 91): ta nhận "�\x90" thay vì "Đ". Byte thứ 2 còn
# nguyên nên khôi phục chắc chắn được, khác với các trường hợp mất byte khác.
_LOST_D = {"�\x90": "Đ", "�\x91": "đ"}

# Số hiệu dạng "82/2025/NĐ-CP", "58/2008/TTLT-BTC-BTNMT", "03/1997/QH9",
# hoặc không có năm như Quyết định của Bộ: "2777/QĐ-BTC"
_DOC_NUM_RE = re.compile(r"\d{1,5}(?:/\d{4})?/[A-ZĐ][A-ZĐ0-9]*(?:-[A-ZĐ0-9]+)*")


def repair_lost_d(text: Optional[str]) -> Optional[str]:
    """Khôi phục chữ Đ/đ bị mất byte đầu, rồi sửa mojibake còn lại (nếu có)."""
    if not text:
        return text
    for broken, good in _LOST_D.items():
        text = text.replace(broken, good)
    return fix_mojibake(text)


def resolve_so_hieu(raw: Optional[str], title: Optional[str]) -> str:
    """
    Chọn số hiệu đáng tin nhất.

    Thứ tự: số hiệu từ payload (đã sửa Đ) nếu sạch -> số hiệu tìm trong tiêu
    đề DOM (luôn đúng encoding) -> giữ nguyên giá trị cũ.
    """
    fixed = repair_lost_d((raw or "").strip()) or ""
    if fixed and not is_mojibake(fixed):
        return fixed
    m = _DOC_NUM_RE.search(title or "")
    if m:
        return m.group(0)
    return fixed or "UNKNOWN"


def has_document_number(so_hieu: Optional[str]) -> bool:
    """False với "Không số", "UNKNOWN" hoặc chuỗi không giống số hiệu."""
    return bool(so_hieu and _DOC_NUM_RE.fullmatch(so_hieu.strip()))


def doc_number_key(so_hieu: Optional[str]) -> Optional[str]:
    """
    Khoá so khớp số hiệu giữa các nguồn: "82/2025/NĐ-CP" ~ "82/2025/nđ-cp " ~ "82/2025/ND-CP".
    None nếu không phải số hiệu hợp lệ (tránh coi mọi "Không số"/"UNKNOWN" là trùng nhau).
    """
    fixed = repair_lost_d((so_hieu or "").strip()) or ""
    fixed = re.sub(r"\s+", "", fixed).upper()
    if not has_document_number(fixed):
        return None
    return fixed.replace("Đ", "D")


def parse_vn_date(value: Optional[str]) -> Optional[date]:
    """'DD/MM/YYYY' -> date; trả None nếu rỗng hoặc sai định dạng."""
    m = re.fullmatch(r"(\d{2})/(\d{2})/(\d{4})", (value or "").strip())
    if not m:
        return None
    try:
        return date(int(m.group(3)), int(m.group(2)), int(m.group(1)))
    except ValueError:
        return None


def normalize_attachments(attachments: list) -> list:
    """
    Sửa tên file hỏng encoding, gộp bản trùng (ưu tiên bản đã tải được) và
    đánh dấu lại các file metadata ghi `downloaded` nhưng không còn trên đĩa.
    """
    merged: dict = {}
    for att in attachments or []:
        if not isinstance(att, dict):
            continue
        att = dict(att)
        att["file_name"] = repair_lost_d(att.get("file_name") or "") or ""

        local = att.get("local_path")
        if att.get("downloaded") and (not local or not Path(local).is_file()):
            att["downloaded"] = False
            att["download_error"] = "file missing on disk"

        key = att["file_name"].casefold()
        current = merged.get(key)
        if current is None or (att.get("downloaded") and not current.get("downloaded")):
            merged[key] = att
    return list(merged.values())


def normalize_record(rec: dict) -> dict:
    """Áp toàn bộ bước chuẩn hoá cho 1 bản ghi metadata (trả về chính dict đó)."""
    rec["so_hieu"] = resolve_so_hieu(rec.get("so_hieu"), rec.get("tieu_de"))
    rec["attachments"] = normalize_attachments(rec.get("attachments") or [])
    return rec
