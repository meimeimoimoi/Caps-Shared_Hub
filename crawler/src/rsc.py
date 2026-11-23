"""
src/rsc.py
==========
Tiện ích đọc dữ liệu từ payload React Server Components (RSC) của Next.js.

VÌ SAO CẦN MODULE NÀY?
---------------------
vbpl.vn là ứng dụng Next.js App Router. Toàn bộ dữ liệu (danh sách văn bản,
metadata, toàn văn) KHÔNG nằm trong HTML tĩnh mà được tải qua "Server Action":
một request POST mà phần body trả về là payload RSC dạng văn bản, mỗi dòng
có dạng `<id>:<json>`:

    0:["$@1",["HcJCr6aAS2l1zPKIdHYZR",null]]
    1:{"total":6802,"pageNumber":1,"pageSize":10,"items":[
        {"id":"72547","title":"Thông tư liên tịch số 58/2008/...",
         "docType":{"name":"Thông tư liên tịch","code":"TTLT_TW",...},
         "issueDate":"2008-07-04T00:00:00",
         "document_url":"https://vbpl.vn/van-ban/chi-tiet/72547", ...}, ...]}

Đây chính là nơi chứa `id` và `document_url` cần thiết để dựng link trang tài liệu
(https://vbpl.vn/van-ban/chi-tiet/{id}). DOM của trang tìm kiếm KHÔNG chứa id
(card chỉ có tiêu đề + nút PDF/Tải về), nên không thể lấy id bằng selector.

Module này gồm 3 phần:
  1. fix_mojibake()       - sửa lỗi double-encoding khiến tiếng Việt thành
                            "ChÆ°Æ¡ng" thay vì "Chương" (Playwright/CDP decode
                            body sai charset rồi encode lại thành UTF-8).
  2. iter_rsc_rows()      - tách payload thành từng row và decode JSON.
  3. find_search_result() - lấy đúng object chứa "items" của trang tìm kiếm.
"""

import json
import re
from typing import Any, Iterator, List, Optional, Tuple

# Ký tự "dấu hiệu mojibake": chúng KHÔNG xuất hiện trong tiếng Việt đúng chuẩn
# (tiếng Việt dùng Latin Extended: Đ/đ/ă/â/ê/ô/ơ/ư + dấu, không dùng các ký tự
# Latin-1 "ký tự có dấu" của tiếng Pháp/Đức/Thổ Nhĩ Kỳ như Ã, Æ, Â, Ð, Ä, Ö).
_MOJIBAKE_MARKERS = ("Ã", "Æ", "Â", "Ð", "Ñ", "Ä", "¶", "Ø")

# Một row trong payload RSC: "1:{...}" hoặc "2:Tcdee,<html>".
# id row có thể là số hoặc hex (1, 2, a, 1f, 2a...).
_ROW_RE = re.compile(r"^([0-9a-fA-F]+):(.*)$", re.DOTALL)

# Row chứa text thô trong RSC: "T" + độ dài byte HEX + "," + nội dung.
# Ví dụ thực tế: "Tcdee,<!DOCTYPE html>..." (0xcdee = 52718 byte)
# Lưu ý độ dài là HEX nên có thể chứa chữ cáf, không chỉ chữ số.
_TEXT_ROW_RE = re.compile(r"^T[0-9a-fA-F]+,", re.DOTALL)


# ============================================================
#  1. SỬA LỖI ENCODING
# ============================================================

def _mojibake_score(text: str) -> int:
    """Đếm số ký tự dấu hiệu bị lỗi encoding (càng nhiều càng sai)."""
    return sum(text.count(c) for c in _MOJIBAKE_MARKERS)


def is_mojibake(text: Optional[str]) -> bool:
    """
    True nếu chuỗi chắc chắn bị hỏng encoding và không thể tin dùng.

    Dùng khi chọn giữa nhiều nguồn dữ liệu cho cùng một trường (ví dụ tiêu đề
    từ payload server bị hỏng nhưng bản đọc từ DOM thì sạch).
    """
    if not text or "\ufffd" in text:
        return True
    return _mojibake_score(text) > 0


def _mixed_cp1252_repair(text: str) -> Optional[str]:
    """
    Sửa chuỗi mojibake khi bị trộn lẫn byte hỏng và ký tự Unicode đúng.

    Payload thực tế của vbpl.vn bị hỏng KHÔNG hoàn toàn: phần tiếng Việt bị
    double-encoding ("ThÃ´ng") nhưng vẫn còn ký tự Unicode đúng chuẩn lọt vào
    (ví dụ chữ "Đ" U+0110, dấu "ạ" U+1EA1). Vì vậy `text.encode("cp1252")` ném
    UnicodeEncodeError và cách sửa "nguyên chuỗi" bỏ qua.

    Cách sửa: với từng ký tự, lấy byte cp1252 nếu được (ký tự đang hỏng), còn
    lại lấy byte UTF-8 (ký tự vốn đã đúng) - rồi decode cả chuỗi byte đó theo
    UTF-8 một lần duy nhất.
    """
    buf = bytearray()
    for ch in text:
        try:
            buf += ch.encode("cp1252")
        except UnicodeEncodeError:
            buf += ch.encode("utf-8")
    return buf.decode("utf-8", errors="replace")


def fix_mojibake(text: str) -> str:
    """
    Sửa chuỗi bị "double-encoding" UTF-8.

    Nguyên nhân: Chrome DevTools Protocol trả body đã decode bằng charset
    Latin-1/CP1252 thay vì UTF-8, nên chữ "Chương" (bytes C6 B0 C6 A1) bị đọc
    thành "ChÆ°Æ¡ng". Playwright lại encode chuỗi đó thành UTF-8 trước khi trả
    về cho Python, nên ta nhận được chuỗi đã hỏng ở tầng byte.

    Cách sửa: encode ngược lại bằng cp1252 (fallback latin-1) để lấy đúng bytes
    UTF-8 gốc, rồi decode UTF-8. Nếu chuỗi bị trộn lẫn (một phần hỏng, một
    phần đúng) thì dùng `_mixed_cp1252_repair()` xử lý từng ký tự.

    Trả về nguyên chuỗi nếu không sửa được (an toàn, không ném exception).
    """
    if not text:
        return text

    before = _mojibake_score(text)
    if before == 0:
        return text

    for repair in (
        lambda t: t.encode("cp1252").decode("utf-8"),
        lambda t: t.encode("latin-1").decode("utf-8"),
        _mixed_cp1252_repair,
    ):
        try:
            fixed = repair(text)
        except (UnicodeEncodeError, UnicodeDecodeError):
            continue
        # Chỉ chấp nhận nếu số dấu hiệu lỗi giảm rõ rệt
        if _mojibake_score(fixed) < before:
            return fixed

    return text


# ============================================================
#  2. TÁCH / DECODE ROW
# ============================================================

def iter_rsc_rows(payload: str) -> Iterator[Tuple[str, Any]]:
    """
    Duyệt các row trong payload RSC, trả về (row_id, giá_trị_đã_decode).

    Giá trị trả về:
      - dict/list nếu row chứa JSON hợp lệ
      - str nếu row bắt đầu bằng "T" (text thô, ví dụ toàn văn HTML)
      - None nếu không decode được

    Row có thể bị ngắt dòng trong payload (Next.js chia payload dài thành nhiều
    dòng `<id>:<chunk>`), nên ta gom liền các dòng liên tiếp cho tới khi gặp
    row id mới rồi mới thử decode.
    """
    buf_id: Optional[str] = None
    buf: List[str] = []

    for line in payload.split("\n"):
        m = _ROW_RE.match(line)
        if m:
            if buf_id is not None:
                yield from _split_row(buf_id, "\n".join(buf))
            buf_id = m.group(1)
            buf = [m.group(2)]
        elif buf_id is not None:
            buf.append(line)

    if buf_id is not None:
        yield from _split_row(buf_id, "\n".join(buf))


_TEXT_ROW_LEN_RE = re.compile(r"^T([0-9a-fA-F]+),")
_TRAILING_ROW_RE = re.compile(r">([0-9a-fA-F]+):(?=[\[{])")


def _split_row(row_id: str, raw: str) -> Iterator[Tuple[str, Any]]:
    """
    A text row ("T<hex byte length>,<text>") has no trailing newline, so the next row
    (e.g. the metadata "1:{...}" after "</html>") sits on the same line. Cut it at the
    declared length when that lands on a row start; otherwise (bytes lost to mojibake)
    keep the whole chunk as before.
    """
    m = _TEXT_ROW_LEN_RE.match(raw)
    if m:
        body = raw[m.end():].encode("utf-8")
        length = int(m.group(1), 16)
        rest = body[length:].decode("utf-8", errors="replace")
        if rest and _ROW_RE.match(rest):
            yield row_id, body[:length].decode("utf-8", errors="replace")
            yield from iter_rsc_rows(rest)
            return
        # Length is off: split at the last "><id>:{" / "><id>:[" whose tail is valid JSON
        text = raw[m.end():]
        tail = None
        for tail in _TRAILING_ROW_RE.finditer(text):
            pass
        if tail:
            value = _decode_row_value(text[tail.start() + 1 + len(tail.group(1)) + 1:])
            if isinstance(value, (dict, list)):
                yield row_id, text[:tail.start() + 1]
                yield tail.group(1), value
                return
    yield row_id, _decode_row_value(raw)


def _decode_row_value(raw: str) -> Any:
    """Decode giá trị của 1 row RSC (JSON hoặc text thô)."""
    if raw is None:
        return None

    # Row text thô: "Tcdee,<html>..." hoặc "T1f,<html>..."
    # Độ dài byte viết dạng HEX nên phải dùng regex thay vì isdigit().
    if _TEXT_ROW_RE.match(raw):
        return raw[_TEXT_ROW_RE.match(raw).end():]

    stripped = raw.strip()
    if not stripped:
        return None

    if stripped[0] in "{[":
        try:
            return json.loads(stripped)
        except json.JSONDecodeError:
            return None

    return None


# ============================================================
#  3. LẤY KẾT QUẢ TÌM KIẾM
# ============================================================

def find_search_result(payload: str) -> Optional[dict]:
    """
    Tìm trong payload RSC của trang tìm kiếm object chứa danh sách `items`.

    Server action trả về object dạng:
        {"total": 6802, "pageNumber": 1, "pageSize": 10, "items": [...]}

    Trả về dict đó, hoặc None nếu payload không chứa kết quả tìm kiếm.
    """
    for _row_id, value in iter_rsc_rows(payload):
        if isinstance(value, dict) and isinstance(value.get("items"), list):
            return value
    return None


def find_document_detail(payload: str) -> Optional[dict]:
    """
    Tìm object metadata văn bản trong payload RSC của trang chi tiết.

    Trang chi tiết gọi cùng một server action với tham số [id] nhưng trả về
    nhiều object: toàn văn HTML, cây điều khoản, lịch sử hiệu lực, và metadata
    văn bản. Object metadata là object có cả `id` lẫn `docNum`.
    """
    for _row_id, value in iter_rsc_rows(payload):
        if isinstance(value, dict) and value.get("id") and "docNum" in value:
            return value
    return None



def find_document_relations(payload: str, relation_types: Optional[dict] = None) -> Optional[List[dict]]:
    """
    Read the "Lược đồ" (relation diagram) row of a detail-page payload.

    The row looks like {"documentNamesByType": {code: [{id, name, effectAllType}]},
    "documentNamesBySource": {...}}. ByType = this document acts on the target
    ("out"), BySource = the target acts on this document ("in").
    Returns None when the payload has no such row.
    """
    relation_types = relation_types or {}
    for _row_id, value in iter_rsc_rows(payload):
        if not (isinstance(value, dict) and "documentNamesByType" in value):
            continue
        relations = []
        for key, direction in (("documentNamesByType", "out"), ("documentNamesBySource", "in")):
            for code, targets in (value.get(key) or {}).items():
                for target in targets or []:
                    if not isinstance(target, dict) or not target.get("id"):
                        continue
                    name = target.get("name")
                    # "<<ccr:...>>" is an unresolved RSC reference, not a title
                    if not isinstance(name, str) or name.startswith("<<"):
                        name = None
                    relations.append({
                        "code": str(code),
                        "type": relation_types.get(str(code), str(code)),
                        "direction": direction,
                        "doc_id": str(target["id"]),
                        "title": name,
                    })
        return relations
    return None


def find_vbhn_list(payload: str) -> Optional[List[dict]]:
    """
    Consolidated documents (VBHN) that merged this document:
    [{"vbhnDocument": {...}, "mergedDocuments": [...]}] -> flat dicts, one per docNum.
    Returns None when the payload has no such row (an empty list is indistinguishable
    from other empty actions).
    """
    for _row_id, value in iter_rsc_rows(payload):
        if not (isinstance(value, list) and value and isinstance(value[0], dict)
                and "vbhnDocument" in value[0]):
            continue
        out, seen = [], set()
        for entry in value:
            vbhn = entry.get("vbhnDocument") or {}
            # The same VBHN can be listed twice under different ids
            if not vbhn.get("id") or vbhn.get("docNum") in seen:
                continue
            seen.add(vbhn.get("docNum"))
            out.append({
                "id": str(vbhn["id"]),
                "doc_num": vbhn.get("docNum"),
                "issue_date": (vbhn.get("issueDate") or "")[:10] or None,
                "merged": [
                    {"id": str(m["id"]), "doc_num": m.get("docNum"),
                     "issue_date": (m.get("issueDate") or "")[:10] or None}
                    for m in entry.get("mergedDocuments") or [] if m.get("id")
                ],
            })
        return out
    return None

def find_full_text_html(payload: str) -> Optional[str]:
    """
    Tìm phần toàn văn HTML của văn bản trong payload RSC trang chi tiết.

    Toàn văn nằm ở row text thô bắt đầu bằng "<!DOCTYPE html>" hoặc "<html".
    Chỉ xét ký tự đầu vì payload RSC còn chứa nhiều row text khác (tên file,
    lời nhắc, v.v) - điều kiện doctype/html ở đầu là đủ để nhận diện toàn văn.
    """
    for _row_id, value in iter_rsc_rows(payload):
        if isinstance(value, str) and value:
            head = value[:500].lower()
            if "<html" in head or "<!doctype html" in head:
                return value
    return None


# ============================================================
#  4. TIỆN ÍCH SUY RA ID
# ============================================================

_UUID_RE = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", re.IGNORECASE
)


def guess_id_type(doc_id: Optional[str]) -> Optional[str]:
    """
    Đoán dạng của id văn bản trên vbpl.vn: "uuid" hoặc "numeric".

    vbpl.vn dùng lẫn lộn hai dạng: văn bản cũ dùng số (vd: "8535"), văn bản mới
    dùng UUID (vd: "95f386c0-ab59-11f1-931d-2538f4c3ad05"). Cả hai đều ghép
    được vào URL /van-ban/chi-tiet/{id}.
    """
    if not doc_id:
        return None
    doc_id = str(doc_id).strip()
    if _UUID_RE.match(doc_id):
        return "uuid"
    if doc_id.isdigit():
        return "numeric"
    return "other"


def build_detail_url(doc_id: str, base_url: str, document_url: Optional[str] = None) -> str:
    """
    Dựng URL trang chi tiết từ id văn bản.

    Ưu tiên `document_url` do server trả về (đã là URL đầy đủ, chắc chắn đúng),
    nếu không có thì tự ghép từ `base_url` + "/van-ban/chi-tiet/" + doc_id.
    """
    if document_url:
        document_url = document_url.strip()
        if document_url.startswith("http"):
            return document_url
        if document_url.startswith("/"):
            return base_url.rstrip("/") + document_url

    return f"{base_url.rstrip('/')}/van-ban/chi-tiet/{doc_id}"
