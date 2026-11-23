"""
src/file_downloader.py
========================
Tải file PDF hoặc DOCX cho từng văn bản pháp luật về máy local.

CHIẾN LƯỢC TẢI FILE (ưu tiên từ trên xuống):
  1. [PLAYWRIGHT] Mở trang chi tiết, tìm và click nút "PDF" trong DocumentCard.
  2. [PLAYWRIGHT] Nếu không có PDF, click nút "DOC"/"DOCX"/"Tải về".
  3. [REQUESTS]   Fallback: nếu doc.attachments có URL tĩnh (từ BeautifulSoup),
                  tải thẳng qua HTTP stream — PDF trước, DOC/DOCX sau.

GHI CHÚ:
  Module này KHÔNG trích xuất text từ file — việc đó thuộc về storage.py.
  Mục tiêu duy nhất: tải file về đĩa và ghi nhận local_path vào doc.attachments.
"""

import time
import random
import shutil
from pathlib import Path
from typing import Optional, List

import requests
from slugify import slugify
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from playwright.sync_api import (
    sync_playwright,
    Page,
    Download,
    TimeoutError as PWTimeout,
)

import config
from src.models import LegalDocument, Attachment
from src.logger_setup import setup_logger

logger = setup_logger(__name__, config.LOG_DIR)


# ──────────────────────────────────────────────
#  Helpers dùng chung
# ──────────────────────────────────────────────

def _polite_delay():
    """Delay ngẫu nhiên giữa các request để tránh gây tải cho server."""
    delay = random.uniform(config.DELAY_MIN_SECONDS, config.DELAY_MAX_SECONDS)
    logger.debug(f"    [delay] {delay:.1f}s")
    time.sleep(delay)


def _build_dest_path(doc: LegalDocument, file_type: str, hint: str = "") -> Path:
    """
    Trả về đường dẫn lưu file:
        data/pdf/<loai_vb_folder>/<so_hieu_slug>[_hint].<ext>
    """
    folder = config.get_folder_name(doc.loai_van_ban)
    slug   = slugify(doc.so_hieu or "unknown", separator="-")
    suffix = ("_" + slugify(hint, separator="-")) if hint else ""
    ext    = file_type.lower().lstrip(".")
    dest   = config.PDF_DIR / folder / f"{slug}{suffix}.{ext}"
    dest.parent.mkdir(parents=True, exist_ok=True)
    return dest


def _already_downloaded(dest: Path, label: str = "") -> bool:
    """True nếu file đã tồn tại và có dung lượng > 0 — bỏ qua tải lại."""
    if dest.exists() and dest.stat().st_size > 0:
        logger.info(f"  [SKIP] File da ton tai ({dest.stat().st_size:,} bytes): {dest.name}")
        return True
    return False


def _detect_ext(path: Path) -> Optional[str]:
    """
    Đọc magic bytes đầu file để xác định định dạng thực tế.
    Tránh trường hợp browser lưu file DOC với tên .pdf.

    %PDF   -> pdf
    PK..   -> docx  (Office Open XML, ZIP-based)
    D0CF.. -> doc   (OLE2 Compound Document)
    """
    try:
        header = path.read_bytes()[:8]
        if header.startswith(b"%PDF"):
            return "pdf"
        if header.startswith(b"PK\x03\x04"):
            return "docx"
        if header[:4] == b"\xd0\xcf\x11\xe0":
            return "doc"
    except Exception:
        pass
    ext = path.suffix.lstrip(".").lower()
    return ext if ext else None


# ──────────────────────────────────────────────
#  Tầng 3: requests stream (URL tĩnh)
# ──────────────────────────────────────────────

@retry(
    stop=stop_after_attempt(config.MAX_RETRIES),
    wait=wait_exponential(multiplier=1, min=2, max=15),
    retry=retry_if_exception_type((requests.ConnectionError, requests.Timeout)),
)
def _stream_download(url: str, dest: Path) -> None:
    """Tải file qua HTTP streaming. Raise nếu server trả HTML (soft-404)."""
    with requests.get(
        url,
        headers=config.REQUEST_HEADERS,
        timeout=config.REQUEST_TIMEOUT,
        stream=True,
    ) as resp:
        resp.raise_for_status()
        ct = resp.headers.get("Content-Type", "").lower()
        if "text/html" in ct:
            raise ValueError(f"Server tra ve HTML (Content-Type: {ct}) — URL co the sai.")
        with open(dest, "wb") as f:
            for chunk in resp.iter_content(chunk_size=8_192):
                if chunk:
                    f.write(chunk)


# ──────────────────────────────────────────────
#  Tầng 1 & 2: Playwright click nút tải
# ──────────────────────────────────────────────

# Nhãn nút ưu tiên PDF
_PDF_FIRST = ["PDF", "DOC", "DOCX", "Tải về", "Tải xuống", "Download"]
# Nhãn nút ưu tiên DOC
_DOC_FIRST = ["DOC", "DOCX", "PDF", "Tải về", "Tải xuống", "Download"]

# Map nhãn → các selector thực tế
_BTN_SELECTORS = {
    "PDF":       ["button:has-text('PDF')", "a:has-text('PDF')",
                  "span:has-text('PDF')", "[title*='PDF' i]",
                  "a[href$='.pdf']", "a[href*='.pdf?']"],
    "DOC":       ["button:has-text('DOC')", "a:has-text('DOC')",
                  "span:has-text('DOC')", "[title*='DOC' i]",
                  "a[href$='.doc']", "a[href*='.doc?']"],
    "DOCX":      ["button:has-text('DOCX')", "a:has-text('DOCX')",
                  "span:has-text('DOCX')", "a[href$='.docx']"],
    "Tải về":    ["button:has-text('Tải về')", "a:has-text('Tải về')",
                  "span:has-text('Tải về')"],
    "Tải xuống": ["button:has-text('Tải xuống')", "a:has-text('Tải xuống')",
                  "span:has-text('Tải xuống')"],
    "Download":  ["button:has-text('Download')", "a:has-text('Download')"],
}


def _suppress_popups(page: Page) -> None:
    """Inject CSS ẩn toàn bộ modal/popup ngay khi DOM khởi tạo."""
    page.add_init_script("""
        const s = document.createElement('style');
        s.innerHTML = '.ida_modal, .modal, [class*="modal"], [class*="popup"] '
                    + '{ display: none !important; pointer-events: none !important; }';
        document.head.appendChild(s);
    """)


def _click_download_btn(page: Page, prefer_pdf: bool = True) -> Optional[Download]:
    """
    Duyệt qua danh sách nhãn nút theo thứ tự ưu tiên.
    Với mỗi nhãn, thử từng CSS selector. Nếu click thành công và browser
    phát ra sự kiện 'download', trả về đối tượng Download.

    Log chi tiết: nhãn đang thử, selector tìm thấy, vị trí nút trên trang.
    Trả về None nếu không tìm/click được nút nào.
    """
    priority = _PDF_FIRST if prefer_pdf else _DOC_FIRST

    for label in priority:
        selectors = _BTN_SELECTORS.get(label, [])
        logger.info(f"  [TIM NUT] Nhan: '{label}' — thu {len(selectors)} selector...")

        for sel in selectors:
            try:
                locator = page.locator(sel)
                count = locator.count()
                if count == 0:
                    logger.debug(f"    selector '{sel}': 0 phan tu — bo qua")
                    continue

                # Lấy element đầu tiên visible
                btn = locator.first
                try:
                    btn.wait_for(state="visible", timeout=2_000)
                except PWTimeout:
                    logger.debug(f"    selector '{sel}': tim thay nhung khong visible — bo qua")
                    continue

                # Đọc vị trí nút trên trang để log
                try:
                    box = btn.bounding_box()
                    pos_info = f"x={box['x']:.0f}, y={box['y']:.0f}" if box else "vi tri khong xac dinh"
                except Exception:
                    pos_info = "vi tri khong doc duoc"

                btn_text = ""
                try:
                    btn_text = btn.inner_text().strip()[:60]
                except Exception:
                    pass

                logger.info(
                    f"    [TIM THAY] selector='{sel}' | "
                    f"text='{btn_text}' | {pos_info} | "
                    f"so luong phan tu khop: {count}"
                )
                logger.info(f"    [CLICK] Dang bam nut '{label}' ({sel})...")

                with page.expect_download(timeout=30_000) as dl_info:
                    try:
                        btn.click(force=True)
                        logger.info(f"    [CLICK] Da bam (click force=True)")
                    except Exception as click_err:
                        logger.debug(f"    click() that bai ({click_err}), thu evaluate...")
                        page.evaluate("el => el.click()", btn.element_handle())
                        logger.info(f"    [CLICK] Da bam qua JS evaluate()")

                dl = dl_info.value
                suggested = dl.suggested_filename
                logger.info(
                    f"    [DOWNLOAD BAT DAU] Ten file de xuat: '{suggested}' | "
                    f"Nhan: '{label}' | Selector: '{sel}'"
                )
                return dl

            except PWTimeout:
                logger.warning(
                    f"    [TIMEOUT] Bam nut '{label}' ({sel}) nhung khong co su kien download "
                    f"trong 30 giay — thu selector tiep theo"
                )
                continue
            except Exception as e:
                logger.debug(f"    selector '{sel}' loi: {e}")
                continue

        logger.info(f"  [KHONG TIM THAY] Khong co nut nhan '{label}' nao co the bam.")

    return None


def _playwright_try_download(
    detail_url: str,
    dest: Path,
    prefer_pdf: bool,
    doc_label: str = "",
) -> bool:
    """
    Mở trang chi tiết bằng Playwright, click nút tải, lưu file về dest.
    Trả về True nếu tải thành công.
    """
    mode = "PDF-first" if prefer_pdf else "DOC-first"
    logger.info(f"  [PLAYWRIGHT:{mode}] Mo trinh duyet -> {detail_url}")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=config.HEADLESS)
        context = browser.new_context(
            user_agent=config.USER_AGENT,
            locale="vi-VN",
            viewport={"width": 1440, "height": 900},
            accept_downloads=True,
        )
        # Chặn script tracking/popup
        context.route("**/*biznext*", lambda r: r.abort())
        context.route("**/*cmp*",     lambda r: r.abort())

        page = context.new_page()
        _suppress_popups(page)
        page.set_default_timeout(config.PLAYWRIGHT_TIMEOUT_MS)

        try:
            page.goto(detail_url, wait_until="networkidle")
            logger.info(f"  [PLAYWRIGHT] Trang da tai xong. URL hien tai: {page.url}")

            # Dọn modal còn sót sau khi trang load
            removed = page.evaluate(
                "(() => {"
                "  const els = document.querySelectorAll("
                "    '.ida_modal, .modal, [class*=\"modal\"], [class*=\"popup\"]'"
                "  );"
                "  els.forEach(el => el.remove());"
                "  return els.length;"
                "})()"
            )
            if removed:
                logger.info(f"  [PLAYWRIGHT] Da xoa {removed} phan tu modal/popup con sot.")

            _polite_delay()

            # ---- Tìm và click nút tải ----
            dl = _click_download_btn(page, prefer_pdf=prefer_pdf)
            if dl is None:
                logger.warning(f"  [PLAYWRIGHT:{mode}] Khong tim duoc nut tai nao — that bai.")
                return False

            # ---- Lưu file ----
            logger.info(f"  [LUU FILE] Dang luu -> {dest}")
            dl.save_as(str(dest))

            if not dest.exists() or dest.stat().st_size == 0:
                raise ValueError("File sau khi luu co kich thuoc 0 byte.")

            file_size = dest.stat().st_size
            actual_ext = _detect_ext(dest)
            logger.info(
                f"  [OK] Da tai xong: {dest.name} | "
                f"Kich thuoc: {file_size:,} bytes | "
                f"Dinh dang thuc te: {actual_ext or 'khong xac dinh'}"
            )

            # Nếu định dạng thực tế khác đuôi file → đổi tên
            if actual_ext and not dest.name.endswith(f".{actual_ext}"):
                new_dest = dest.with_suffix(f".{actual_ext}")
                shutil.move(str(dest), str(new_dest))
                logger.info(f"  [DOI TEN] {dest.name} -> {new_dest.name} (dua tren magic bytes)")
                dest = new_dest  # noqa: PLW2901 — intentional

            return True

        except Exception as e:
            logger.error(f"  [PLAYWRIGHT:{mode}] Loi: {e}")
            if dest.exists():
                dest.unlink(missing_ok=True)
            return False

        finally:
            context.close()
            browser.close()


# ──────────────────────────────────────────────
#  Hàm trợ giúp cập nhật attachments
# ──────────────────────────────────────────────

def _mark_downloaded(doc: LegalDocument, local_path: str, file_type: str) -> None:
    """
    Cập nhật hoặc tạo mới Attachment trong doc.attachments
    để ghi nhận file đã tải thành công.
    """
    for att in doc.attachments:
        if (att.file_type or "").lower() == file_type.lower() and not att.downloaded:
            att.local_path = local_path
            att.downloaded = True
            att.file_type  = file_type
            return
    doc.attachments.append(
        Attachment(
            file_name   = Path(local_path).name,
            source_url  = doc.detail_url,
            local_path  = local_path,
            file_type   = file_type,
            downloaded  = True,
        )
    )


# ──────────────────────────────────────────────
#  API CÔNG KHAI
# ──────────────────────────────────────────────

def download_document_files(doc: LegalDocument) -> LegalDocument:
    """
    Tải file PDF hoặc DOC/DOCX cho 1 văn bản pháp luật.

    Luồng:
      [A] Playwright — click nút PDF
          -> Thành công: lưu file, cập nhật doc.attachments, kết thúc.
      [B] Playwright — click nút DOC/DOCX/Tải về
          -> Thành công: lưu file, cập nhật doc.attachments, kết thúc.
      [C] Requests stream — URL tĩnh trong doc.attachments (PDF trước, DOC sau)
          -> Thành công: lưu file, cập nhật doc.attachments, kết thúc.
      [FAIL] Không tải được bằng cách nào: ghi nhận lỗi vào attachments.

    Không trích text — chỉ tải file về đĩa.
    """
    sep = "─" * 60
    logger.info(sep)
    logger.info(f"[TAI FILE] {doc.so_hieu or 'UNKNOWN'} | {doc.loai_van_ban}")
    logger.info(f"           Tieu de: {doc.tieu_de[:80]}")
    logger.info(f"           URL    : {doc.detail_url}")
    logger.info(sep)

    if not doc.detail_url:
        logger.warning("  Khong co detail_url — bo qua.")
        return doc

    # ── [A] Playwright: PDF ──────────────────────────────────────────
    logger.info("  === BUOC A: Thu tai PDF qua trinh duyet ===")
    pdf_dest = _build_dest_path(doc, "pdf")
    if _already_downloaded(pdf_dest):
        _mark_downloaded(doc, str(pdf_dest), "pdf")
        return doc

    if _playwright_try_download(doc.detail_url, pdf_dest, prefer_pdf=True, doc_label=doc.so_hieu):
        actual = _detect_ext(pdf_dest)
        # Đổi tên nếu thực ra là DOC/DOCX
        if actual and actual != "pdf":
            real_dest = _build_dest_path(doc, actual)
            shutil.move(str(pdf_dest), str(real_dest))
            logger.info(f"  [A] Thuc chat la {actual.upper()}, da doi ten file.")
            _mark_downloaded(doc, str(real_dest), actual)
        else:
            _mark_downloaded(doc, str(pdf_dest), "pdf")
        logger.info(f"  === BUOC A: THANH CONG ===\n")
        _polite_delay()
        return doc

    logger.info("  === BUOC A: That bai ===")

    # ── [B] Playwright: DOC ──────────────────────────────────────────
    logger.info("  === BUOC B: Thu tai DOC/DOCX qua trinh duyet ===")
    doc_dest = _build_dest_path(doc, "doc")
    if _already_downloaded(doc_dest):
        _mark_downloaded(doc, str(doc_dest), "doc")
        return doc

    if _playwright_try_download(doc.detail_url, doc_dest, prefer_pdf=False, doc_label=doc.so_hieu):
        actual = _detect_ext(doc_dest)
        if actual and actual not in ("doc", "docx"):
            real_dest = _build_dest_path(doc, actual)
            shutil.move(str(doc_dest), str(real_dest))
            logger.info(f"  [B] Thuc chat la {actual.upper()}, da doi ten file.")
            _mark_downloaded(doc, str(real_dest), actual)
        else:
            _mark_downloaded(doc, str(doc_dest), actual or "doc")
        logger.info(f"  === BUOC B: THANH CONG ===\n")
        _polite_delay()
        return doc

    logger.info("  === BUOC B: That bai ===")

    # ── [C] Fallback: requests stream từ URL tĩnh ─────────────────────
    if doc.attachments:
        logger.info("  === BUOC C: Fallback — tai tu URL tinh trong attachments ===")
        sorted_atts = sorted(
            doc.attachments,
            key=lambda a: {"pdf": 0, "doc": 1, "docx": 1}.get(
                (a.file_type or "").lower(), 2
            ),
        )
        for att in sorted_atts:
            if att.downloaded:
                continue
            ext  = att.file_type if att.file_type not in (None, "unknown") else "pdf"
            dest = _build_dest_path(doc, ext, hint=att.file_name[:20])

            if _already_downloaded(dest):
                att.local_path = str(dest)
                att.downloaded = True
                return doc

            logger.info(f"    [C] Thu tai: {att.source_url}")
            logger.info(f"        Luu ve : {dest}")
            try:
                _stream_download(att.source_url, dest)
                sz = dest.stat().st_size
                if sz == 0:
                    raise ValueError("File 0 byte sau khi tai.")
                att.local_path = str(dest)
                att.downloaded = True
                logger.info(f"    [C] THANH CONG: {dest.name} ({sz:,} bytes)")
                logger.info(f"  === BUOC C: THANH CONG ===\n")
                _polite_delay()
                return doc
            except Exception as e:
                logger.error(f"    [C] THAT BAI: {e}")
                att.download_error = str(e)
                if dest.exists():
                    dest.unlink(missing_ok=True)

        logger.info("  === BUOC C: Het URL tinh, khong tai duoc ===")
    else:
        logger.info("  === BUOC C: Bo qua — attachments rong ===")

    # ── FAIL ─────────────────────────────────────────────────────────
    logger.error(
        f"\n  [THAT BAI TOAN DIEN] {doc.so_hieu}: "
        f"khong tai duoc file bang bat ky phuong phap nao.\n"
    )
    if not doc.attachments:
        doc.attachments.append(
            Attachment(
                file_name      = "",
                source_url     = doc.detail_url,
                downloaded     = False,
                download_error = "Khong tim duoc nut tai hoac URL file hop le tren trang.",
            )
        )
    return doc


def download_all_documents(docs: List[LegalDocument]) -> List[LegalDocument]:
    """
    Tải file cho toàn bộ danh sách văn bản (tuần tự).
    In tiến trình và tổng kết sau khi hoàn tất.
    """
    total   = len(docs)
    success = 0
    failed  = []

    logger.info(f"\n{'='*60}")
    logger.info(f"TAI FILE: {total} van ban")
    logger.info(f"{'='*60}\n")

    for i, doc in enumerate(docs, 1):
        logger.info(f"\n[{i}/{total}] ──────────────────────────────────────")
        download_document_files(doc)
        ok = any(a.downloaded for a in doc.attachments)
        if ok:
            success += 1
        else:
            failed.append(doc.so_hieu or doc.tieu_de[:40])

    logger.info(f"\n{'='*60}")
    logger.info(f"KET QUA TAI FILE: {success}/{total} thanh cong")
    if failed:
        logger.warning(f"That bai ({len(failed)}): {', '.join(failed)}")
    logger.info(f"{'='*60}\n")
    return docs


# ──────────────────────────────────────────────
#  Backward-compat (không xóa để không break code cũ)
# ──────────────────────────────────────────────

def download_attachment(doc: LegalDocument, attachment: Attachment) -> Attachment:
    """[Legacy] Tải 1 attachment cụ thể bằng requests stream."""
    ext  = attachment.file_type if attachment.file_type not in (None, "unknown") else "pdf"
    dest = _build_dest_path(doc, ext)

    if _already_downloaded(dest):
        attachment.local_path = str(dest)
        attachment.downloaded = True
        return attachment

    logger.info(f"  [legacy] {attachment.source_url} -> {dest}")
    try:
        _stream_download(attachment.source_url, dest)
        sz = dest.stat().st_size
        if sz == 0:
            raise ValueError("File 0 byte.")
        attachment.local_path = str(dest)
        attachment.downloaded = True
        logger.info(f"  [legacy OK] {sz:,} bytes")
    except Exception as e:
        logger.error(f"  [legacy FAIL] {e}")
        attachment.downloaded     = False
        attachment.download_error = str(e)
        if dest.exists():
            dest.unlink(missing_ok=True)

    _polite_delay()
    return attachment


def download_all_attachments(doc: LegalDocument) -> LegalDocument:
    """
    [Legacy] Dùng download_document_files() thay thế.
    Giữ lại để scraper_agent.py không cần sửa import.
    """
    return download_document_files(doc)
