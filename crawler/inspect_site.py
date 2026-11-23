#!/usr/bin/env python3
"""
inspect_site.py
================
Công cụ HỖ TRỢ DEBUG — mở trình duyệt CÓ GIAO DIỆN (headless=False) tới trang
tìm kiếm vbpl.vn, tự động gõ từ khóa, rồi GIỮ NGUYÊN trình duyệt mở để bạn tự
tay dùng F12 (DevTools) kiểm tra cấu trúc HTML thực tế.

MỤC ĐÍCH: Xác minh/cập nhật lại các CSS selector trong config.py (mục
SELECTORS) trước khi chạy scraper_agent.py hàng loạt, đề phòng trường hợp
giao diện vbpl.vn đã thay đổi so với lúc code này được viết.

CÁCH DÙNG:
    python inspect_site.py

    Sau khi trình duyệt mở lên và điền từ khóa xong, script sẽ in ra hướng dẫn
    và CHỜ bạn nhấn Enter trong terminal để đóng trình duyệt (cho bạn thời gian
    thoải mái bấm F12 xem DevTools).

NHỮNG GÌ CẦN KIỂM TRA TRONG DEVTOOLS:
    1. Tab Elements:
       - Click chọn ô input tìm kiếm -> xem tag + class/id thực tế
         -> so sánh với config.SELECTORS["search_input"]
       - Click chọn 1 dòng kết quả trong danh sách -> xem tag + class
         -> so sánh với config.SELECTORS["result_item"]
       - Bên trong 1 dòng kết quả, xem thẻ <a> chứa link chi tiết
         -> so sánh với config.SELECTORS["result_item_link"]
       - Tìm khu vực filter "Loại văn bản" -> xem cách nó hoạt động
         (dropdown đơn giản hay popup checkbox nhiều lớp?)

    2. Tab Network (lọc theo "Fetch/XHR"):
       - Gõ từ khóa và bấm Enter/Tìm kiếm, quan sát có request nào gọi tới
         1 API trả về JSON không (thường có path chứa "search", "api", "query"...)
       - NẾU CÓ: đây là phát hiện QUAN TRỌNG - có thể viết code gọi thẳng API
         này bằng `requests` (nhanh hơn Playwright rất nhiều). Ghi lại:
         + URL đầy đủ của request
         + Method (GET/POST)
         + Request payload/params (nếu là POST, xem tab Payload)
         + Cấu trúc JSON trả về (xem tab Response)
       - Nếu tìm thấy API này, có thể viết thêm 1 module
         `src/api_search_client.py` dùng requests thuần, bỏ qua hẳn Playwright
         cho bước tìm kiếm - giúp scraper nhanh và nhẹ hơn đáng kể.
"""

import sys
import time

from playwright.sync_api import sync_playwright

import config
from src.logger_setup import setup_logger

logger = setup_logger("inspect_site", config.LOG_DIR)


def main():
    keyword = config.KEYWORD
    if len(sys.argv) > 1:
        keyword = sys.argv[1]

    logger.info(f"Mở trình duyệt (có giao diện) tới: {config.SEARCH_URL}")
    logger.info(f"Sẽ tự động gõ từ khóa: '{keyword}'")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False, slow_mo=300)  # slow_mo để dễ quan sát
        context = browser.new_context(user_agent=config.USER_AGENT, locale="vi-VN")
        page = context.new_page()

        page.goto(config.SEARCH_URL, wait_until="networkidle")
        logger.info("Đã load xong trang. Đang thử điền từ khóa vào ô tìm kiếm...")

        try:
            candidates = [s.strip() for s in config.SELECTORS["search_input"].split(",")]
            filled = False
            for sel in candidates:
                try:
                    locator = page.locator(sel).first
                    locator.wait_for(state="visible", timeout=5000)
                    locator.click()
                    locator.fill(keyword)
                    locator.press("Enter")
                    logger.info(f"✓ Đã điền từ khóa thành công với selector: '{sel}'")
                    filled = True
                    break
                except Exception:
                    continue

            if not filled:
                logger.warning(
                    "✗ KHÔNG selector nào trong config.SELECTORS['search_input'] hoạt động. "
                    "Bạn cần tự tìm ô input trên trình duyệt đang mở, dùng F12 > "
                    "chuột phải vào ô input > Inspect > copy selector, rồi cập nhật "
                    "config.py."
                )

        except Exception as e:
            logger.error(f"Lỗi khi thử điền từ khóa: {e}")

        time.sleep(2)  # Đợi kết quả (nếu có) render ra

        print("\n" + "=" * 70)
        print("TRÌNH DUYỆT ĐANG MỞ - HÃY DÙNG F12 (DEVTOOLS) ĐỂ KIỂM TRA:")
        print("=" * 70)
        print(__doc__.split("NHỮNG GÌ CẦN KIỂM TRA")[1] if "NHỮNG GÌ CẦN KIỂM TRA" in __doc__ else "")
        print("=" * 70)
        input("\n>>> Nhấn Enter trong terminal này để ĐÓNG trình duyệt và kết thúc...\n")

        browser.close()

    logger.info("Đã đóng trình duyệt. Cập nhật config.py nếu bạn phát hiện selector khác.")


if __name__ == "__main__":
    main()
