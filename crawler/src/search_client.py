"""
src/search_client.py
=====================
Module tìm kiếm văn bản + vào trang tài liệu + tải file, tất cả trong 1 browser
session (Playwright).

VÌ SAO KHÔNG LẤY ĐƯỢC ID TỪ DOM?
---------------------------------
DOM của card kết quả trên vbpl.vn KHÔNG chứa id văn bản:

    <div class="DocumentCard_cardContent__5tVRC">
      <span class="block cursor-pointer">
        <div class="DocumentCard_documentTitle__aE_F_">Thông tư liên tịch số 58/2008/...</div>
      </span>
      <button>PDF</button> <button>Lược đồ</button> <button>Tải về</button>
    </div>

Không có `data-id`, không có thẻ `<a href>`, không có UUID nào trong HTML. Toàn bộ
dữ liệu (kể cả id) nằm trong payload "React Server Components" mà trang gọi qua
Server Action (POST). Vì vậy module này:

  1. Gắn listener vào `page.on("response")` để bắt payload server action.
  2. Tìm trong payload object chứa `items` -> mỗi item có `id` + `document_url`.
  3. Dựng URL: https://vbpl.vn/van-ban/chi-tiet/{id}
  4. `page.goto()` vào URL đó (URL THỰC SỰ tool đã vào được lưu lại).
  5. Bấm tab "Tải về" trên trang chi tiết để tải file đính kèm.
  6. Ghi lại toàn văn text lấy được ở trang chi tiết.

LỢI ÍCH:
  - Chỉ 1 browser session cho mỗi loại văn bản.
  - Không cần `requests`: trang chi tiết là SPA, `requests` bị 403 và không có nội dung.
  - metadata.json nhận đủ: doc_id + URL đã vào + file đã tải.
"""

import random
import re
import shutil
import time
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Set, Tuple

from playwright.sync_api import (
    Page,
    Playwright,
    Response,
    sync_playwright,
    TimeoutError as PlaywrightTimeoutError,
)
from slugify import slugify

import config
from src.logger_setup import setup_logger
from src.models import SearchResultItem
from src.normalize import doc_number_key
from src.references import doc_type_for_number
from src.rsc import (
    build_detail_url,
    find_document_detail,
    find_document_relations,
    find_vbhn_list,
    find_full_text_html,
    find_search_result,
    fix_mojibake,
    guess_id_type,
)

logger = setup_logger(__name__, config.LOG_DIR)

SEP = "─" * 68


# ─────────────────────────────────────────────────────────────────
#  Helpers chung
# ─────────────────────────────────────────────────────────────────

def _polite_delay(min_s: float = None, max_s: float = None) -> None:
    """Delay ngẫu nhiên giữa các thao tác để tránh gây tải cho server."""
    lo = config.DELAY_MIN_SECONDS if min_s is None else min_s
    hi = config.DELAY_MAX_SECONDS if max_s is None else max_s
    d = random.uniform(lo, hi)
    logger.debug(f"  [delay] {d:.1f}s")
    time.sleep(d)


# Script chèn vào mọi trang để dọn popup/banner cookie của BizNext.
# Bắt buộc phải có vì overlay này chặn MỌI click của Playwright (kể cả force=True).
#
# Lưu ý: chỉ xoá node KHÔNG đủ - script của trang tự chèn lại banner liên tục
# (nó có timer show lại), nên ta vá cả DOM API để chặn node ida_modal ngay từ
# lúc nó được chèn vào.
_KILL_OVERLAY_JS = """
(() => {
  const SEL = [
    '.ida_modal', '[class*="ida_modal"]', '[class*="ida-modal"]',
    '[id*="ida-modal"]', '[id^="ida_"]', '#ida_modal',
    '[data-ida-banner-click-bound]',
  ].join(',');

  const isOverlay = (el) =>
    el && el.nodeType === 1 &&
    (el.matches?.(SEL) ||
     el.querySelector?.(SEL) !== null);

  const kill = () => {
    document.querySelectorAll(SEL).forEach((e) => e.remove());
    // Ẩn mọi overlay cố định phủ lên trang (nhưng KHÔNG đụng .ant-modal
    // vì đó là modal "File đính kèm" ta cần dùng).
    document.querySelectorAll('body > div').forEach((e) => {
      const cs = getComputedStyle(e);
      if ((cs.position === 'fixed') && cs.pointerEvents !== 'none'
          && !e.querySelector('.ant-modal') && e.innerText.trim().length < 400) {
        e.remove();
      }
    });
  };

  // Chặn site chèn lại overlay: mọi đường chèn DOM đều bị lọc.
  for (const fn of ['appendChild', 'insertBefore', 'prepend', 'after', 'replaceWith']) {
    const orig = Element.prototype[fn];
    if (!orig) continue;
    Element.prototype[fn] = function (node, ...rest) {
      const incoming = (node && node.nodeType === 11) ? node.children : [node];
      for (const n of Array.from(incoming || [])) {
        if (isOverlay(n)) return n;
      }
      return orig.call(this, node, ...rest);
    };
  }

  kill();
  new MutationObserver(kill).observe(document.documentElement,
    { childList: true, subtree: true });
  document.addEventListener('DOMContentLoaded', kill);
  window.addEventListener('load', kill);
})();
"""


def _install_overlay_killer(page: Page) -> None:
    """Cài overlay-killer chạy trước mọi script của trang."""
    page.add_init_script(_KILL_OVERLAY_JS)


def _detect_ext(path: Path) -> Optional[str]:
    """Xác định định dạng thực tế của file qua magic bytes."""
    try:
        h = path.read_bytes()[:8]
        if h.startswith(b"%PDF"):
            return "pdf"
        if h.startswith(b"PK\x03\x04"):
            return "docx"
        if h[:4] == b"\xd0\xcf\x11\xe0":
            return "doc"
    except Exception:
        pass
    return path.suffix.lstrip(".").lower() or None


def _build_dest_path(doc_type: str, so_hieu: str, original_name: str) -> Path:
    """
    Đường dẫn lưu file: data/pdf/<folder loại văn bản>/<số hiệu>__<tên file gốc>

    Ghép cả số hiệu (để dễ tra cứu) và tên file gốc (để giữ đúng tên vbpl.vn đặt).
    """
    folder = config.get_folder_name(doc_type)
    slug = slugify(so_hieu or "unknown", separator="-") or "unknown"
    safe_name = re.sub(r'[<>:"/\\|?*\x00-\x1f]', "_", original_name).strip() or "file"
    dest = config.PDF_DIR / folder / f"{slug}__{safe_name}"
    dest.parent.mkdir(parents=True, exist_ok=True)
    return dest


# ─────────────────────────────────────────────────────────────────
#  Bắt payload Server Action
# ─────────────────────────────────────────────────────────────────

class _PayloadListener:
    """
    Bắt & giữ payload server action của vbpl.vn.

    Server action là POST tới chính URL trang hiện tại với body text, response
    trả về `text/x-component` (payload RSC). Ta lọc theo request body để biết
    đó là search (`pageNumber` trong body) hay detail (`["<id>"]` trong body).
    """

    def __init__(self) -> None:
        self.search_payloads: List[dict] = []
        self.detail_payloads: List[str] = []
        self._last_error: Optional[str] = None

    def attach(self, page: Page) -> None:
        page.on("response", self._on_response)

    def clear(self) -> None:
        self.search_payloads.clear()
        self.detail_payloads.clear()

    def _on_response(self, response: Response) -> None:
        try:
            if response.request.method != "POST":
                return
            post_data = response.request.post_data or ""
            is_search = "pageNumber" in post_data
            is_detail = bool(re.fullmatch(r'\s*\[\s*"?[0-9a-zA-Z\-]{1,64}"?\s*\]\s*', post_data))
            if not (is_search or is_detail):
                return

            text = fix_mojibake(response.body().decode("utf-8", errors="replace"))

            if is_search:
                result = find_search_result(text)
                if result:
                    self.search_payloads.append(result)
                    logger.debug(
                        f"  [API] search payload: total={result.get('total')} "
                        f"items={len(result.get('items') or [])}"
                    )
            else:
                self.detail_payloads.append(text)
        except Exception as e:  # noqa: BLE001 - listener không được làm sập pipeline
            self._last_error = str(e)
            logger.debug(f"  [API] khong doc duoc payload: {e}")

    def wait_for_search(
        self,
        timeout_ms: int,
        min_count: int = 0,
        predicate: Optional[Callable[[dict], bool]] = None,
    ) -> Optional[dict]:
        """Chờ tới khi có payload tìm kiếm mới (nhiều hơn `min_count` payload đã bắt)."""
        deadline = time.monotonic() + timeout_ms / 1000
        while time.monotonic() < deadline:
            if len(self.search_payloads) > min_count:
                candidate = self.search_payloads[-1]
                if predicate is None or predicate(candidate):
                    return candidate
            time.sleep(0.25)
        return self.search_payloads[-1] if self.search_payloads else None

    def wait_for_detail(
        self,
        timeout_ms: int,
        min_count: int = 0,
    ) -> Optional[str]:
        """Chờ tới khi có payload chi tiết mới (chứa metadata/toàn văn văn bản)."""
        deadline = time.monotonic() + timeout_ms / 1000
        while time.monotonic() < deadline:
            if len(self.detail_payloads) > min_count:
                return self.detail_payloads[-1]
            time.sleep(0.25)
        return self.detail_payloads[-1] if self.detail_payloads else None


# ─────────────────────────────────────────────────────────────────
#  Bộ lọc "Loại văn bản"
# ─────────────────────────────────────────────────────────────────

# Click đúng 1 checkbox trong nhóm "Loại văn bản" có text khớp CHÍNH XÁC.
# Dùng evaluate + innerText exact-match vì selector CSS không biết trước vị trí
# (nhóm bộ lọc render động, có cả nhóm "Cơ quan ban hành" chứa "Bộ luật"...).
_CLICK_DOCTYPE_JS = """
(want) => {
  const norm = s => (s || '').replace(/\\s+/g, ' ').trim();
  const labels = Array.from(document.querySelectorAll('label'));
  const hit = labels.find(l => norm(l.innerText) === want);
  if (!hit) return null;
  const box = hit.querySelector('.ant-checkbox') || hit;
  box.click();
  return norm(hit.innerText);
}
"""

# Đọc `value` của ô checkbox loại văn bản. Đây chính là UUID docType mà server
# dùng, ví dụ:
#   <label class="ant-checkbox-wrapper ...">Luật
#     <input class="ant-checkbox-input" type="checkbox" value="11025e19-...">
#
# Vì `value` chỉ gồm ký tự ASCII nên KHÔNG bị ảnh hưởng bởi lỗi mojibake -
# đây là cách lọc đáng tin cậy hơn nhiều so với so sánh tên hiển thị.
_READ_DOCTYPE_VALUE_JS = """
(want) => {
  const norm = s => (s || '').replace(/\\s+/g, ' ').trim();
  const labels = Array.from(document.querySelectorAll('label'));
  const hit = labels.find(l => norm(l.innerText) === want);
  if (!hit) return null;
  const input = hit.querySelector('input[type=checkbox]');
  if (!input) return null;
  return {value: input.getAttribute('value') || '', checked: !!input.checked};
}
"""


def _read_doc_type_filter_value(page: Page, doc_type: str) -> Optional[str]:
    """Lấy UUID docType của ô lọc tương ứng `doc_type` (nếu trang đã render bộ lọc)."""
    try:
        data = page.evaluate(_READ_DOCTYPE_VALUE_JS, doc_type)
    except Exception as e:
        logger.debug(f"  [LOC] Khong doc duoc value cua bo loc '{doc_type}': {e}")
        return None

    if not data:
        return None
    if not data.get("value"):
        logger.debug(f"  [LOC] Checkbox '{doc_type}' khong co thuoc tinh value.")
        return None

    logger.debug(f"  [LOC] docType id cua '{doc_type}' = {data['value']}")
    return data["value"]


def _select_doc_type_filter(page: Page, doc_type: str) -> bool:
    """Bật bộ lọc "Loại văn bản" = doc_type. Trả về True nếu bấm được."""
    try:
        clicked = page.evaluate(_CLICK_DOCTYPE_JS, doc_type)
    except Exception as e:
        logger.warning(f"  [LOC] Loi khi chon bo loc '{doc_type}': {e}")
        return False

    if clicked:
        logger.info(f"  [LOC] Da bat bo loc 'Loai van ban' = '{clicked}'")
        return True

    logger.warning(
        f"  [LOC] Khong tim thay checkbox '{doc_type}' trong bo loc. "
        f"Se loc lai theo docType cua server."
    )
    return False


def _item_matches_doc_type(
    api_item: dict,
    doc_type: str,
    doc_type_id: Optional[str] = None,
) -> bool:
    """
    True nếu 1 item của server thực sự thuộc loại văn bản yêu cầu.

    Ưu tiên so khớp theo UUID (`docType.id` == `doc_type_id`) vì đây là định danh
    duy nhất, chỉ gồm ký tự ASCII nên không bị lỗi mojibake ảnh hưởng. Chỉ khi
    không lấy được UUID mới lùi về so khớp theo tên hiển thị.
    """
    dt = (api_item or {}).get("docType") or {}

    if doc_type_id:
        item_id = (dt.get("id") or "").strip()
        if item_id:
            return item_id == doc_type_id

    name = (dt.get("name") or "").strip()
    code = config.DOC_TYPE_CODE_MAP.get(doc_type)
    item_code = (dt.get("code") or "").strip()

    if name == doc_type:
        return True
    if code and item_code == code:
        return True
    if name and (name.startswith(doc_type + " ") or doc_type.startswith(name + " ")):
        return True
    return False


def _filter_items_by_doc_type(
    items: List[dict],
    doc_type: str,
    doc_type_id: Optional[str] = None,
) -> List[dict]:
    """Lọc danh sách items theo loại văn bản (dùng khi bộ lọc UI không bấm được)."""
    return [it for it in items if _item_matches_doc_type(it, doc_type, doc_type_id)]


# ─────────────────────────────────────────────────────────────────
#  Trang chi tiết: đọc toàn văn + tải file
# ─────────────────────────────────────────────────────────────────

def _read_title_from_dom(page: Page) -> Optional[str]:
    """
    Đọc tiêu đề văn bản từ thẻ <h1> của trang chi tiết.

    Cần thiết vì payload server action đi qua Chrome DevTools Protocol bị hỏng
    một số byte tiếng Việt: byte 0x81 (ký tự "ề" trong UTF-8) không tồn tại
    trong bảng cp1252 nên bị thay bằng U+FFFD và không thể phục hồi từ payload.
    DOM thì không qua lớp decode đó nên luôn cho tiêu đề đúng.
    """
    try:
        h1 = page.locator("h1").first
        if not h1.count():
            return None
        title = (h1.inner_text() or "").strip()
        return title if len(title) > 12 else None
    except Exception as e:
        logger.debug(f"  [TITLE] khong doc duoc <h1>: {e}")
        return None


def _read_full_text(page: Page) -> Optional[str]:
    """
    Đọc toàn văn văn bản ở tab "Nội dung" của trang chi tiết.

    Toàn văn không nằm sẵn trong HTML: tab "Nội dung" tải nội dung qua server
    action nên phải chờ nó render. Vì vậy ta bấm tab rồi POLL lấy text cho tới
    khi đủ dài hoặc hết thời gian chờ - bấm 1 lần rồi đọc ngay sẽ thỉnh
    thoảng bắt được pane rỗng.
    """
    try:
        content_tab = page.locator(config.DETAIL_SELECTORS["tab"], has_text="Nội dung").first
        if content_tab.count():
            content_tab.evaluate("e => e.click()")
    except Exception as e:
        logger.debug(f"  [NOI DUNG] khong click duoc tab 'Noi dung': {e}")

    pane_sel = config.DETAIL_SELECTORS["active_pane"]
    deadline = time.monotonic() + 20
    best = ""

    while time.monotonic() < deadline:
        try:
            pane = page.locator(pane_sel).first
            if pane.count():
                text = (pane.inner_text() or "").strip()
                if len(text) > len(best):
                    best = text
                # Đủ nội dung thì dừng sớm, tránh chờ hết 20s không cần thiết.
                if len(text) > 2_000:
                    return text
        except Exception as e:
            logger.debug(f"  [NOI DUNG] loi khi doc pane: {e}")
        page.wait_for_timeout(1_000)

    return best if len(best) > 200 else None


def _list_detail_files(page: Page) -> List[dict]:
    """
    Mở tab "Tải về" và trả về danh sách file: [{name, info}, ...]

    Mỗi file là 1 card có tên file + dung lượng + ngày, kèm 1 nút icon tải về
    (button không có text nên phải lấy tên từ thẻ cha).
    """
    try:
        dl_tab = page.locator(config.DETAIL_SELECTORS["tab"], has_text="Tải về").first
        if not dl_tab.count():
            logger.info("  [TAI] Trang chi tiet khong co tab 'Tai ve'.")
            return []
        dl_tab.evaluate("e => e.click()")
        page.wait_for_timeout(1_500)

        return page.evaluate(
            """
            () => {
              const pane = document.querySelector('.ant-tabs-tabpane-active');
              if (!pane) return [];
              const btns = Array.from(pane.querySelectorAll('button'));
              return btns.map((b, i) => {
                const card = b.closest('div');
                const info = (card ? card.innerText : '') || '';
                const m = info.match(/[^\\n\\/\\\\:*?"<>|]+\\.(pdf|docx?|PDF|DOCX?)/);
                return {
                  name: m ? m[0].trim() : ('file_' + (i + 1)),
                  info: info.replace(/\\n/g, ' | ').trim(),
                };
              });
            }
            """
        ) or []
    except Exception as e:
        logger.warning(f"  [TAI] Loi khi mo tab 'Tai ve': {e}")
        return []


def _download_files_from_detail(
    page: Page,
    doc_type: str,
    so_hieu: str,
    skip_download: bool = False,
) -> List[Path]:
    """
    Tải về tất cả file trong tab "Tải về" của trang chi tiết.

    Trả về list Path các file đã lưu thành công.
    """
    saved: List[Path] = []
    files = _list_detail_files(page)

    # innerText lấy từ DOM cũng đi qua cùng lớp decode lỗi của CDP -> sửa lại
    for f in files:
        f["name"] = fix_mojibake(f.get("name") or "")
        f["info"] = fix_mojibake(f.get("info") or "")

    if not files:
        return saved

    if skip_download:
        logger.info(f"  [TAI] Bo qua (--skip-download): trang co {len(files)} file.")
        return saved

    pane = page.locator(config.DETAIL_SELECTORS["active_pane"]).first
    buttons = pane.locator("button")
    n_btn = min(buttons.count(), len(files))
    logger.info(f"  [TAI] Tab 'Tai ve' co {n_btn} file.")

    for i in range(n_btn):
        meta = files[i]
        name = meta.get("name") or f"file_{i + 1}"
        try:
            with page.expect_download(timeout=30_000) as dl_info:
                buttons.nth(i).evaluate("e => e.click()")
            dl = dl_info.value

            dest = _build_dest_path(doc_type, so_hieu, dl.suggested_filename or name)
            dl.save_as(str(dest))

            size = dest.stat().st_size if dest.exists() else 0
            if size == 0:
                logger.error(f"    [LUU FAIL] {name}: file 0 byte.")
                dest.unlink(missing_ok=True)
                continue

            # Xác nhận định dạng thật qua magic bytes, đổi tên nếu cần
            actual = _detect_ext(dest)
            expected = dest.suffix.lstrip(".").lower()
            if actual and actual != expected:
                fixed = dest.with_suffix(f".{actual}")
                shutil.move(str(dest), str(fixed))
                dest = fixed

            saved.append(dest)
            logger.info(f"    [LUU OK] {name} -> {dest} ({size:,} bytes)")

        except PlaywrightTimeoutError:
            logger.warning(f"    [TIMEOUT] '{name}': khong co su kien download trong 30s.")
        except Exception as e:
            logger.warning(f"    [TAI FAIL] '{name}': {e}")
        _polite_delay(0.4, 1.0)

    return saved


# ─────────────────────────────────────────────────────────────────
#  Hàm chính
# ─────────────────────────────────────────────────────────────────

def _make_search_result_item(
    api_item: dict,
    doc_type: str,
    search_url: str,
    doc_type_id: Optional[str] = None,
) -> Optional[SearchResultItem]:
    """Chuyển 1 item raw của server thành SearchResultItem (đã có doc_id + URL)."""
    if not isinstance(api_item, dict):
        return None

    doc_id = api_item.get("id")
    if not doc_id:
        logger.warning("  [API] Item khong co 'id' -> bo qua.")
        return None

    # Chốt chặn cuối: không bao giờ tạo item sai loại văn bản (tránh lưu nhầm
    # thư mục, ví dụ lọc "Luật" mà lấy "Thông tư").
    if not _item_matches_doc_type(api_item, doc_type, doc_type_id):
        actual = ((api_item.get("docType") or {}).get("name") or "?")
        logger.warning(
            f"  [API] Bo qua item id={doc_id}: docType la '{actual}', "
            f"khong phai '{doc_type}'."
        )
        return None

    document_url = api_item.get("document_url")
    detail_url = build_detail_url(str(doc_id), config.BASE_URL, document_url)

    title = (api_item.get("title") or "").strip()
    date_hint = api_item.get("issueDate")

    return SearchResultItem(
        title=title or f"Van ban {doc_id}",
        detail_url=detail_url,
        date_hint=date_hint,
        doc_type=doc_type,
        doc_id=str(doc_id),
        doc_id_type=guess_id_type(str(doc_id)),
        requested_url=detail_url,
        search_url=search_url,
        api_item=api_item,
    )


def _visit_detail_page(
    page: Page,
    listener: _PayloadListener,
    item: SearchResultItem,
    skip_download: bool = False,
) -> SearchResultItem:
    """
    Điều hướng vào trang tài liệu, đọc toàn văn và tải file đính kèm.

    Sau khi vào trang, `item.visited_url` = URL thực sự trình duyệt đã đi tới
    (page.url) - đây chính là URL sẽ được lưu vào metadata.json.
    """
    logger.info(f"  [VAO TRANG] {item.requested_url}")
    n_before = len(listener.detail_payloads)

    error = _goto(page, item.requested_url)
    if error:
        item.download_error = error
        return item

    # --- URL thực sự đã vào ---
    item.visited_url = page.url
    logger.info(f"  [VAO TRANG OK] page.url = {item.visited_url}")

    # --- Metadata + toàn văn từ server action của trang chi tiết ---
    listener.wait_for_detail(config.DETAIL_CONTENT_TIMEOUT_MS, min_count=n_before)
    # The page sends several detail payloads (metadata, provision tree, history...): scan all
    new_payloads = listener.detail_payloads[n_before:]
    detail = next(filter(None, map(find_document_detail, new_payloads)), None)
    if detail:
        item.api_detail = detail
        logger.info(f"  [API CHI TIET] Nhan/tieu de lay duoc tu server.")
    html = next(filter(None, map(find_full_text_html, new_payloads)), None)
    if html:
        # Giữ HTML thô để lớp detail_scraper bóc tách text sạch
        item.full_text = html
        logger.info(f"  [TOAN VAN] Nhan duoc {len(html):,} ký tự HTML toàn văn.")

    # --- Ưu tiên lấy text trực tiếp từ DOM (đã render sẵn) ---
    dom_title = _read_title_from_dom(page)
    if dom_title:
        item.dom_title = dom_title
        if dom_title != item.title:
            logger.info("  [TITLE] Dung tieu de tu DOM (payload bi mojibake).")

    dom_text = _read_full_text(page)
    if dom_text:
        item.full_text = dom_text
        logger.info(f"  [TOAN VAN DOM] {len(dom_text):,} ký tự.")

    # Documents fetched by id have no search filter: take the type from the payload
    if not item.doc_type:
        item.doc_type = ((item.api_detail or {}).get("docType") or {}).get("name")

    # --- Tải file ---
    so_hieu = _guess_so_hieu(item)
    paths = _download_files_from_detail(
        page, item.doc_type or "Khac", so_hieu, skip_download=skip_download
    )
    if paths:
        item.downloaded_paths = [str(p) for p in paths]
        item.downloaded_path = str(paths[0])
    elif not skip_download:
        item.download_error = item.download_error or "khong co file dinh kem"

    # Last: leaves the page, so everything above must be read first
    luoc_do = _read_luoc_do(page, item.doc_id)
    item.relations = luoc_do["relations"] or []
    item.vbhn = luoc_do["vbhn"]
    item.api_detail = item.api_detail or luoc_do["detail"]
    return item


def _new_session(p: Playwright, headless: bool):
    """Open browser + context + page with the payload listener attached."""
    browser = p.chromium.launch(headless=headless)
    context = browser.new_context(
        user_agent=config.USER_AGENT,
        locale="vi-VN",
        viewport={"width": 1440, "height": 1000},
        accept_downloads=True,
    )
    # Chặn script quảng cáo/bảo đồ của BizNext cho nhẹ & nhanh
    context.route("**/*biznext*", lambda r: r.abort())

    page = context.new_page()
    page.set_default_timeout(config.PLAYWRIGHT_TIMEOUT_MS)
    _install_overlay_killer(page)

    listener = _PayloadListener()
    listener.attach(page)
    return browser, context, page, listener


_LUOC_DO_URL_RE = re.compile(r"/van-ban/chi-tiet/[^/?]+\?tabs=luoc-do")
_SINGLE_ID_BODY_RE = re.compile(r'\s*\[\s*"?([0-9a-zA-Z\-]{1,64})"?\s*\]\s*')


def _read_luoc_do(page: Page, doc_id: str) -> dict:
    """
    Open the "Lược đồ" tab of a document. Returns {"relations": list or None if they could
    not be read, "detail": metadata the page also loads (exact bytes, unlike the CDP
    listener), "vbhn": consolidated documents that merged it}.
    """
    found: List[List[dict]] = []
    details: List[dict] = []
    vbhns: List[List[dict]] = []

    def handle(route):
        req = route.request
        m = _SINGLE_ID_BODY_RE.fullmatch(req.post_data or "") if req.method == "POST" else None
        if not m:
            return route.continue_()
        if m.group(1) != doc_id:
            # The tab also loads the full text of every related document: not needed
            return route.abort()
        # Read the body here: with many responses the CDP buffer evicts it before the listener
        resp = route.fetch()
        text = fix_mojibake(resp.body().decode("utf-8", errors="replace"))
        relations = find_document_relations(text, config.RELATION_TYPES)
        if relations is not None:
            found.append(relations)
        detail = find_document_detail(text)
        if detail:
            details.append(detail)
        vbhn = find_vbhn_list(text)
        if vbhn is not None:
            vbhns.append(vbhn)
        route.fulfill(response=resp)

    page.route(_LUOC_DO_URL_RE, handle)
    try:
        # The tab sometimes loads without firing its server actions: retry once from a blank page
        for attempt in range(2):
            if attempt:
                logger.info("  [LUOC DO] Thu lai.")
                page.goto("about:blank")
            # Navigate instead of clicking: after the "Tải về" modal the tab click is ignored
            error = _goto(page, build_detail_url(doc_id, config.BASE_URL) + "?tabs=luoc-do")
            if error:
                logger.warning(f"  [LUOC DO] {error}")
                continue
            deadline = time.monotonic() + config.DETAIL_CONTENT_TIMEOUT_MS / 1000
            # A VBHN page has no relations action: stop once its metadata says so
            is_vbhn = lambda: any(d.get("isConsolidatedDocument") for d in details)  # noqa: E731
            while not found and not is_vbhn() and time.monotonic() < deadline:
                page.wait_for_timeout(250)
            if found or is_vbhn():
                # The VBHN list usually arrives a little after the relations
                try:
                    page.wait_for_load_state("networkidle", timeout=5_000)
                except PlaywrightTimeoutError:
                    pass
                break
    except Exception as e:  # noqa: BLE001 - relations are optional, never fail the crawl
        logger.warning(f"  [LUOC DO] Loi: {e}")
        return {"relations": None, "detail": None, "vbhn": []}
    finally:
        page.unroute(_LUOC_DO_URL_RE, handle)
    result = {
        "relations": found[0] if found else None,
        "detail": details[0] if details else None,
        "vbhn": vbhns[0] if vbhns else [],
    }
    if not found:
        logger.warning("  [LUOC DO] Het thoi gian cho payload quan he.")
    else:
        logger.info(f"  [LUOC DO] {len(found[0])} quan he, {len(result['vbhn'])} VBHN.")
    return result


def _goto(page: Page, url: str) -> Optional[str]:
    """Navigate and wait for the page to settle; returns an error message on failure."""
    try:
        page.goto(url, wait_until="domcontentloaded", timeout=config.PLAYWRIGHT_TIMEOUT_MS)
    except PlaywrightTimeoutError:
        try:
            page.goto(url, wait_until="commit", timeout=config.PLAYWRIGHT_TIMEOUT_MS)
        except Exception as e:  # noqa: BLE001
            logger.error(f"  [VAO TRANG FAIL] {e}")
            return f"goto_failed: {e}"
    try:
        page.wait_for_load_state("networkidle", timeout=15_000)
    except PlaywrightTimeoutError:
        pass
    return None


def fetch_documents_by_ids(
    doc_ids: List[str], headless: bool = True, skip_download: bool = False
) -> List[SearchResultItem]:
    """Visit detail pages by id (no search step), same as a search hit would be visited."""
    results: List[SearchResultItem] = []
    if not doc_ids:
        return results
    with sync_playwright() as p:
        browser, context, page, listener = _new_session(p, headless)
        try:
            for i, doc_id in enumerate(doc_ids, 1):
                url = build_detail_url(doc_id, config.BASE_URL)
                logger.info(f"[LIEN QUAN {i}/{len(doc_ids)}] id={doc_id}")
                item = SearchResultItem(
                    title=f"Van ban {doc_id}",
                    detail_url=url,
                    doc_id=doc_id,
                    doc_id_type=guess_id_type(doc_id),
                    requested_url=url,
                )
                results.append(_visit_detail_page(page, listener, item, skip_download=skip_download))
                _polite_delay()
        except Exception as e:
            logger.error(f"[LIEN QUAN] LOI NGHIEM TRONG: {e}", exc_info=True)
        finally:
            context.close()
            browser.close()
    return results


def fetch_relations_by_ids(doc_ids: List[str], headless: bool = True) -> Dict[str, dict]:
    """Read only the "Lược đồ" tab of each document: {doc_id: {"relations", "vbhn"}}, no full text, no downloads."""
    found: Dict[str, dict] = {}
    if not doc_ids:
        return found
    with sync_playwright() as p:
        browser, context, page, _listener = _new_session(p, headless)
        try:
            for i, doc_id in enumerate(doc_ids, 1):
                logger.info(f"[LUOC DO {i}/{len(doc_ids)}] id={doc_id}")
                luoc_do = _read_luoc_do(page, doc_id)
                if luoc_do["relations"] is not None:  # failures are retried on the next run
                    found[doc_id] = {"relations": luoc_do["relations"], "vbhn": luoc_do["vbhn"]}
                _polite_delay()
        except Exception as e:
            logger.error(f"[LUOC DO] LOI NGHIEM TRONG: {e}", exc_info=True)
        finally:
            context.close()
            browser.close()
    return found



def find_document_ids(numbers: List[str], headless: bool = True) -> Dict[str, str]:
    """Search vbpl for each document number: {number: doc_id} for the ones found."""
    found: Dict[str, str] = {}
    for number in numbers:
        doc_type = doc_type_for_number(number)
        if not doc_type:
            logger.warning(f"[TIM SO HIEU] Khong suy ra duoc loai van ban: {number}")
            continue
        key = doc_number_key(number)
        logger.info(f"[TIM SO HIEU] {number} ({doc_type})")
        # shortcut: one browser session per number (~40 s each), share one session if the list grows large
        items = search_and_download_by_type(
            keyword=number, doc_type=doc_type, top_n=1, headless=headless,
            listing_only=True, save_debug=False,
            item_filter=lambda title, doc_num: doc_number_key(doc_num) == key if doc_num else None,
        )
        if items:
            found[number] = items[0].doc_id
    return found

def _guess_so_hieu(item: SearchResultItem) -> str:
    """Lấy số hiệu văn bản từ api_item.docNum, fallback sang regex trong tiêu đề."""
    api = item.api_item or {}
    doc_num = (api.get("docNum") or "").strip()
    if doc_num:
        # docNum đôi khi chứa cả trích yếu, cắt tại dấu ngoặc
        doc_num = re.split(r"[(\n]", doc_num)[0].strip()
        if doc_num:
            return doc_num

    detail = item.api_detail or {}
    doc_num = (detail.get("docNum") or "").strip()
    if doc_num:
        return doc_num

    m = re.search(r"\d{1,4}/\d{4}/[A-ZĐ\-]+", item.title or "")
    if m:
        return m.group(0)
    return "unknown"


def search_and_download_by_type(
    keyword: str,
    doc_type: str,
    top_n: Optional[int] = 3,
    headless: bool = True,
    skip_download: bool = False,
    listing_only: bool = False,
    save_debug: bool = True,
    item_filter: Optional[Callable[[Optional[str], Optional[str]], Optional[bool]]] = None,
    skip_ids: Optional[Set[str]] = None,
    stats: Optional[dict] = None,
) -> List[SearchResultItem]:
    """
    Tìm `top_n` văn bản mới nhất của loại `doc_type`, vào từng trang tài liệu
    để tải file.

    Chế độ bộ từ khoá (`--keywords-file`):
      - `item_filter(title, docNum)`: False bỏ, None giữ nhưng đánh dấu
        `api_item["_title_uncertain"]` (tên hỏng encoding, kiểm lại bằng tiêu đề DOM)
      - `skip_ids`: doc_id đã cào -> bỏ trước khi vào trang chi tiết
      - `stats`: cộng dồn `listed` / `matched` / `skipped_ids`

    Trả về list SearchResultItem, mỗi item có:
      - doc_id          : id văn bản (để dựng lại URL bất cứ lúc nào)
      - requested_url   : URL dựng từ doc_id
      - visited_url     : URL thực sự trình duyệt đã vào
      - api_item        : metadata raw từ server
      - downloaded_paths: các file đã tải về
    """
    results: List[SearchResultItem] = []
    search_url = config.SEARCH_URL

    with sync_playwright() as p:
        browser, context, page, listener = _new_session(p, headless)

        try:
            # ── Bước 1: Mở trang tìm kiếm ────────────────────────────
            logger.info(SEP)
            logger.info(f"[{doc_type}] Mo trang tim kiem: {search_url}")
            page.goto(search_url, wait_until="domcontentloaded",
                      timeout=config.PLAYWRIGHT_TIMEOUT_MS)
            try:
                page.wait_for_load_state("networkidle", timeout=20_000)
            except PlaywrightTimeoutError:
                pass
            _polite_delay()

            # ── Bước 2: Nhập từ khóa + Enter ─────────────────────────
            search_input = _find_search_input(page)
            if search_input is None:
                logger.error(f"[{doc_type}] Khong tim thay o input tim kiem. Dung.")
                return results

            search_input.click(force=True)
            search_input.fill("")
            search_input.press_sequentially(keyword, delay=25)
            logger.info(f"[{doc_type}] Da nhap tu khoa: '{keyword}'")

            n_before = len(listener.search_payloads)
            search_input.press("Enter")
            logger.info(f"[{doc_type}] Da nhan Enter, dang cho ket qua...")

            payload = listener.wait_for_search(config.SEARCH_PAYLOAD_TIMEOUT_MS,
                                              min_count=n_before)
            if not payload:
                logger.error(f"[{doc_type}] Khong bat duoc payload ket qua tu server.")
                if save_debug:
                    _dump_debug(page, f"debug_nopayload_{doc_type}")
                return results

            # ── Bước 3: Bật bộ lọc "Loại văn bản" ───────────────────
            # Đọc UUID docType từ ô checkbox TRƯỚC khi bấm, dùng làm khoá lọc
            # phía server (ASCII, không bị lỗi mojibake).
            doc_type_id = _read_doc_type_filter_value(page, doc_type)

            # Chỉ dùng payload MỚI sau khi bấm. Không dùng lại payload cũ
            # (chưa lọc) vì sẽ dẫn tới việc gán sai loại văn bản.
            n_before = len(listener.search_payloads)
            filtered_ok = False
            if _select_doc_type_filter(page, doc_type):
                filtered = listener.wait_for_search(
                    config.SEARCH_PAYLOAD_TIMEOUT_MS, min_count=n_before
                )
                if filtered is not None:
                    payload = filtered
                    filtered_ok = True
                else:
                    logger.warning(
                        f"[{doc_type}] Bo loc UI khong tra ve payload moi -> "
                        f"se loc lai theo docType cua server."
                    )

            items: List[dict] = []
            total_hits = payload.get("total")
            seen_item_ids: set = set()

            # ── Bước 4: Duyệt từng trang kết quả, lọc theo docType ──
            # Trang đầu có thể không chứa loại văn bản cần tìm (đặc biệt với
            # từ khóa rộng), nên phải bấm "trang sau" cho tới khi đủ kết quả.
            current_payload = payload
            page_idx = 0
            seen_pages: set = set()
            while True:
                raw_items = list(current_payload.get("items") or [])
                page_fingerprint = tuple(str(it.get("id")) for it in raw_items)
                if page_fingerprint in seen_pages:
                    logger.warning(f"[{doc_type}] Trang ket qua bi lap; dung de tranh vong lap vo han.")
                    break
                seen_pages.add(page_fingerprint)
                matched = _filter_items_by_doc_type(raw_items, doc_type, doc_type_id)

                for it in matched:
                    iid = it.get("id")
                    if not iid or iid in seen_item_ids:
                        continue
                    seen_item_ids.add(iid)
                    if stats is not None:
                        stats["listed"] += 1
                    # Chế độ bộ từ khoá: chỉ giữ văn bản có TÊN khớp (server khớp rất lỏng)
                    if item_filter is not None:
                        verdict = item_filter(it.get("title"), it.get("docNum"))
                        if verdict is False:
                            continue
                        if verdict is None:
                            it["_title_uncertain"] = True
                    if stats is not None:
                        stats["matched"] += 1
                    # Đã cào ở lượt trước / từ khoá trước: không vào trang chi tiết, không tải lại
                    if skip_ids is not None and str(iid) in skip_ids:
                        if stats is not None:
                            stats["skipped_ids"].append(str(iid))
                        continue
                    items.append(it)

                if page_idx == 0:
                    logger.info(
                        f"[{doc_type}] Trang 1: {len(matched)}/{len(raw_items)} "
                        f"ket qua khop '{doc_type}'."
                    )
                else:
                    logger.info(
                        f"[{doc_type}] Trang {page_idx + 1}: cong don "
                        f"{len(items)} ket qua khop '{doc_type}'."
                    )

                if top_n is not None and len(items) >= top_n:
                    break

                if top_n is not None and page_idx + 1 >= config.MAX_RESULT_PAGES:
                    logger.warning(
                        f"[{doc_type}] Da dat gioi han {config.MAX_RESULT_PAGES} trang cua che do dinh ky."
                    )
                    break

                n_before = len(listener.search_payloads)
                if not _go_next_page(page):
                    logger.info(f"[{doc_type}] Da het trang ke qua.")
                    break

                next_payload = listener.wait_for_search(
                    config.SEARCH_PAYLOAD_TIMEOUT_MS, min_count=n_before
                )
                if next_payload is None:
                    logger.warning(f"[{doc_type}] Trang {page_idx + 2} khong tai duoc.")
                    break
                current_payload = next_payload
                page_idx += 1

            if not items and (item_filter is not None or skip_ids):
                # Bộ từ khoá: mọi kết quả bị lọc theo tên hoặc đã cào trước đó - bình thường
                logger.info(f"[{doc_type}] Khong co van ban moi khop ten sau khi loc.")
                return results

            if not items:
                if not filtered_ok:
                    logger.error(
                        f"[{doc_type}] Bo loc '{doc_type}' khong co ket qua nao trong "
                        f"{len(payload.get('items') or [])} ket qua dau tien. "
                        f"Thuong la vi bo loc UI khong ap dung xuong server. "
                        f"Hay thu tu khoa chinh xac hon hoac tang pageSize."
                    )
                else:
                    logger.warning(
                        f"[{doc_type}] Khong con van ban nao khop sau khi loc server-side."
                    )
                if save_debug:
                    _dump_debug(page, f"debug_nomatch_{doc_type}")
                return results

            logger.info(
                f"[{doc_type}] Chon duoc {len(items)} ket qua khop '{doc_type}' "
                f"(tong tim thay {payload.get('total')})."
            )

            if not items:
                logger.warning(f"[{doc_type}] Khong co ket qua nao khop '{doc_type}'.")
                return results
            # ── Bước 5: Vào từng trang tài liệu để tải file ───────────
            n_fetch = len(items) if top_n is None else min(top_n, len(items))
            for i in range(n_fetch):
                logger.info(SEP)
                logger.info(f"[{doc_type}] === VAN BAN #{i + 1}/{n_fetch} ===")

                item = _make_search_result_item(items[i], doc_type, search_url, doc_type_id)
                if item is None:
                    continue

                if listing_only:
                    results.append(item)
                    continue

                logger.info(f"  Tieu de   : {item.title[:90]}")
                logger.info(f"  doc_id    : {item.doc_id} ({item.doc_id_type})")
                logger.info(f"  URL       : {item.requested_url}")

                item = _visit_detail_page(
                    page, listener, item, skip_download=skip_download
                )
                results.append(item)

                n_dl = len(item.downloaded_paths)
                logger.info(
                    f"  [XONG #{i + 1}] id={item.doc_id} | "
                    f"URL da vao={item.visited_url} | file={n_dl}"
                )

                _polite_delay()

            logger.info(SEP)
            logger.info(
                f"[{doc_type}] HOAN TAT: {len(results)}/{n_fetch} van ban, "
                f"{sum(len(r.downloaded_paths) for r in results)} file da tai."
            )

        except Exception as e:
            logger.error(f"[{doc_type}] LOI NGHIEM TRONG: {e}", exc_info=True)

        finally:
            try:
                context.close()
            except Exception:
                pass
            browser.close()

    return results


def _go_next_page(page: Page) -> bool:
    """
    Bấm nút "trang sau" của thanh phân trang.

    Dùng `element.click()` trong JS thay vì `page.click()` của Playwright: banner
    cookie của BizNext (`.ida_modal`) nằm phủ lên trang và chặn mọi sự kiện
    chuột theo toạ độ, khiến Playwright retry vô hạch rồi timeout. Gọi `.click()`
    trực tiếp trên node vẫn kích hoạt đúng handler của React mà không cần
    hit-test.

    Trả về False nếu không còn trang sau (đã tới trang cuối) hoặc không tìm
    thấy nút điều hướng.

    Lưu ý: sau khi server trả payload, antd cần thêm một chút thời gian để render
    lại thanh phân trang. Hàm này vì vậy chờ nút xuất hiện thay vì kiểm tra 1 lần.
    """
    deadline = time.monotonic() + 10
    last_reason = "no-button"

    while time.monotonic() < deadline:
        try:
            clicked = page.evaluate(
                """
                () => {
                  const li = document.querySelector('li.ant-pagination-next');
                  if (!li) return 'no-button';
                  if (li.classList.contains('ant-pagination-disabled')) return 'disabled';
                  if (li.getAttribute('aria-disabled') === 'true') return 'disabled';
                  const btn = li.querySelector('button') || li;
                  if (btn.disabled) return 'disabled';
                  btn.click();
                  return 'clicked';
                }
                """
            )
            if clicked == "clicked":
                page.wait_for_timeout(1_200)
                return True

            last_reason = clicked
            # "disabled" là kết luận chắc chắn (đã ở trang cuối) -> dừng ngay.
            # "no-button" mới chỉ là trạng thái tạm thời (DOM chưa render xong).
            if clicked == "disabled":
                break
        except Exception as e:
            last_reason = f"error: {e}"
            logger.info(f"  [TRANG] Loi khi sang trang: {e}")

        page.wait_for_timeout(500)

    logger.info(f"  [TRANG] Khong sang trang duoc ({last_reason}).")
    return False


def _find_search_input(page: Page):
    """Tìm ô nhập từ khóa trên trang tìm kiếm."""
    for sel in config.SELECTORS["search_input"].split(","):
        sel = sel.strip()
        try:
            loc = page.locator(sel).first
            loc.wait_for(state="visible", timeout=5_000)
            logger.debug(f"  [INPUT] '{sel}'")
            return loc
        except Exception:
            continue
    return None


def _dump_debug(page: Page, name: str) -> None:
    """Lưu HTML trang để debug khi pipeline không lấy được dữ liệu."""
    try:
        path = config.RAW_HTML_DIR / f"{name}.html"
        path.write_text(page.content(), encoding="utf-8")
        logger.warning(f"  [DEBUG] Da luu HTML: {path}")
    except Exception:
        pass


def search_and_download_all_types(
    keyword: str,
    doc_types: List[str],
    top_n: Optional[int] = 3,
    headless: bool = True,
    skip_download: bool = False,
    listing_only: bool = False,
    save_debug: bool = True,
    item_filter: Optional[Callable[[Optional[str], Optional[str]], Optional[bool]]] = None,
    skip_ids: Optional[Set[str]] = None,
    stats: Optional[dict] = None,
) -> List[SearchResultItem]:
    """
    Chạy search_and_download_by_type() tuần tự cho từng loại văn bản.
    Mỗi loại mở 1 browser session riêng (để tránh context bị nhiễm).
    `item_filter` / `skip_ids` / `stats`: xem search_and_download_by_type().
    """
    all_results: List[SearchResultItem] = []
    seen_ids: set = set()

    for doc_type in doc_types:
        logger.info("\n" + "=" * 68)
        logger.info(f"=== BAT DAU: loai van ban '{doc_type}' ===")
        logger.info("=" * 68)

        results = search_and_download_by_type(
            keyword=keyword,
            doc_type=doc_type,
            top_n=top_n,
            headless=headless,
            skip_download=skip_download,
            listing_only=listing_only,
            save_debug=save_debug,
            item_filter=item_filter,
            skip_ids=skip_ids,
            stats=stats,
        )

        # Chống trùng: cùng 1 văn bản có thể khớp nhiều loại (ví dụ "Thông tư"
        # khớp cả "Thông tư liên tịch") - chỉ giữ bản đầu để không tải 2 lần.
        fresh = []
        for r in results:
            if r.doc_id and r.doc_id in seen_ids:
                logger.info(f"  [TRUNG] id={r.doc_id} da co trong ket qua truoc -> bo qua.")
                continue
            if r.doc_id:
                seen_ids.add(r.doc_id)
            fresh.append(r)

        all_results.extend(fresh)

        if top_n is not None and len(results) < top_n:
            logger.warning(f"[{doc_type}] Chi lay duoc {len(results)}/{top_n} van ban.")
        _polite_delay()

    total_dl = sum(len(r.downloaded_paths) for r in all_results)
    logger.info(
        "\n" + "=" * 68
        + f"\nTONG KET: {len(all_results)} ket qua | {total_dl} file tai thanh cong"
        + f" | {len(doc_types)} loai van ban\n" + "=" * 68
    )
    return all_results


# ─────────────────────────────────────────────────────────────────
#  Backward-compat: giữ chữ ký cũ để không break code khác
# ─────────────────────────────────────────────────────────────────

def search_documents_by_type(keyword, doc_type, top_n=3, headless=True, skip_download=False):
    """[Legacy] Gọi search_and_download_by_type()."""
    return search_and_download_by_type(keyword, doc_type, top_n, headless, skip_download)


def search_all_document_types(keyword, doc_types, top_n=3, headless=True, skip_download=False):
    """[Legacy] Gọi search_and_download_all_types()."""
    return search_and_download_all_types(
        keyword, doc_types, top_n, headless, skip_download
    )
