# KẾ HOẠCH CHI TIẾT: AGENT SCRAPER CÀO DỮ LIỆU VBPL.VN
## Thuế Thu Nhập Doanh Nghiệp (TNDN) - Top 3 văn bản gần nhất mỗi loại

**Ngày tạo:** 2026-09-27
**Mục tiêu:** Xây dựng công cụ (agent) tự động cào dữ liệu từ vbpl.vn (Cơ sở dữ liệu quốc gia về pháp luật), lấy top 3 văn bản gần nhất cho mỗi loại (Luật, Nghị định, Thông tư, Quyết định...) liên quan đến Thuế TNDN, bao gồm cả text nội dung và file PDF/DOC gốc.

---

## PHẦN 0: LƯU Ý QUAN TRỌNG VỀ MỤC TIÊU CÀO DỮ LIỆU

### Về trang vbpl.vn

vbpl.vn (Cơ sở dữ liệu quốc gia về pháp luật) là **cổng thông tin công khai chính thức của Bộ Tư pháp**, đăng tải văn bản quy phạm pháp luật để người dân tra cứu miễn phí. Đây không phải dữ liệu riêng tư — việc thu thập phục vụ mục đích xây dựng kho tri thức (RAG) là hợp lý và phổ biến. Tuy nhiên cần tuân thủ các nguyên tắc kỹ thuật tốt:

1. **Rate limiting**: Không gửi request dồn dập (delay 2-5s giữa các lần gọi) để tránh gây tải cho server nhà nước.
2. **User-Agent trung thực**: Không giả mạo, nêu rõ mục đích trong header nếu có thể.
3. **Tôn trọng robots.txt**: Kiểm tra trước khi chạy production.
4. **Không đăng nhập / bypass paywall**: vbpl.vn công khai hoàn toàn, không có paywall.
5. **Lưu trữ có attribution**: Khi đưa vào RAG, giữ nguyên số hiệu, ngày ban hành, cơ quan ban hành để trích dẫn đúng nguồn (đây cũng là yêu cầu ở Flow 2 - Knowledge Governance đã thiết kế trước đó).

### Về mặt kỹ thuật của vbpl.vn (đã khảo sát)

vbpl.vn là **ứng dụng Next.js (Single Page Application)** — nghĩa là:
- Trang tìm kiếm KHÔNG trả về HTML tĩnh chứa kết quả; kết quả được JavaScript render sau khi gọi API nội bộ.
- **`requests` + `BeautifulSoup` đơn thuần SẼ KHÔNG THẤY được danh sách kết quả tìm kiếm** (chỉ thấy khung trang rỗng).
- Cần dùng **trình duyệt giả lập (Playwright hoặc Selenium)** để chạy JavaScript, hoặc **reverse-engineer API JSON nội bộ** (nhanh hơn nhưng có thể thay đổi bất kỳ lúc nào không báo trước).
- Trang chi tiết văn bản và các file đính kèm (`vbpl.vn/TW/Lists/vbpq/Attachments/{id}/{filename}.pdf`) là các **URL tĩnh, tải trực tiếp được bằng `requests`** — không cần trình duyệt.

→ **Chiến lược 2 tầng**: Dùng Playwright chỉ để lấy **danh sách kết quả tìm kiếm** (tiêu đề, link chi tiết, ngày ban hành), sau đó dùng `requests` thuần để tải **trang chi tiết + file đính kèm** (nhanh hơn nhiều, ít tốn tài nguyên).

### Giới hạn của môi trường hiện tại

Môi trường sandbox hiện tại của Claude **không có quyền truy cập mạng tới vbpl.vn** (danh sách domain được phép chỉ gồm pypi, npm, github...). Do đó:
- Code dưới đây được viết đầy đủ, có thể chạy được, nhưng **chưa được test trực tiếp lên vbpl.vn từ trong sandbox này**.
- Bạn cần chạy trên máy cá nhân / server có Internet để test và tinh chỉnh selector nếu giao diện trang thay đổi.
- Tài liệu này có phần **"Bước xác minh selector"** hướng dẫn cách tự kiểm tra và sửa nếu cần.

---

## PHẦN 1: CẤU TRÚC PROJECT

```
vbpl_scraper/
├── PLAN.md                      # Tài liệu này
├── README.md                    # Hướng dẫn sử dụng nhanh
├── requirements.txt             # Danh sách package cần cài
├── .env.example                 # Mẫu file cấu hình biến môi trường
├── config.py                    # Cấu hình: từ khóa, loại văn bản, số lượng, đường dẫn output
├── src/
│   ├── __init__.py
│   ├── models.py                 # Data class: LegalDocument, Attachment
│   ├── search_client.py          # Module tìm kiếm (Playwright)
│   ├── detail_scraper.py         # Module lấy chi tiết + text văn bản (requests)
│   ├── file_downloader.py        # Module tải PDF/DOC
│   ├── storage.py                # Lưu metadata.json, tổ chức thư mục output
│   └── logger_setup.py           # Cấu hình logging
├── scraper_agent.py              # ĐIỂM VÀO CHÍNH (CLI) — chạy toàn bộ pipeline
├── inspect_site.py               # Script phụ trợ: mở trình duyệt có UI để bạn tự soi selector
├── data/
│   ├── raw_html/                 # Cache HTML thô (debug)
│   ├── pdf/                      # File PDF/DOC tải về, tổ chức theo loại văn bản
│   │   ├── nghi_dinh/
│   │   ├── thong_tu/
│   │   ├── luat/
│   │   └── quyet_dinh/
│   ├── text/                     # Text đã trích xuất (.txt), cùng cấu trúc thư mục
│   └── metadata.json             # Index tổng hợp toàn bộ văn bản đã cào
└── logs/
    └── scraper_YYYYMMDD.log
```

---

## PHẦN 2: CÁC BƯỚC THỰC HIỆN (STEP BY STEP)

### BƯỚC 1: Tạo file & cấu trúc thư mục

```bash
mkdir -p vbpl_scraper/src vbpl_scraper/data/{raw_html,pdf,text} vbpl_scraper/logs
cd vbpl_scraper
touch src/__init__.py
```

Toàn bộ các file code đã được viết sẵn ở Phần 3 bên dưới — bạn chỉ cần copy nguyên văn vào đúng đường dẫn.

### BƯỚC 2: Tạo virtual environment & cài đặt package

```bash
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate

pip install -r requirements.txt

# Playwright cần tải thêm trình duyệt (Chromium) riêng, khoảng 150-300MB
playwright install chromium
playwright install-deps chromium   # Linux: cài thư viện hệ thống cần thiết (libnss3, libatk...)
```

**Nội dung `requirements.txt`** (chi tiết ở Phần 3):
```
playwright==1.48.0
requests==2.32.3
beautifulsoup4==4.12.3
lxml==5.3.0
python-slugify==8.0.4
tenacity==9.0.0
python-dotenv==1.0.1
tqdm==4.66.5
pdfplumber==0.11.4
```

### BƯỚC 3: Kiểm tra kết nối & xác minh selector (QUAN TRỌNG — bắt buộc trước khi chạy thật)

Giao diện web có thể thay đổi theo thời gian. Trước khi chạy scraper hàng loạt, chạy script `inspect_site.py` để **mở trình duyệt có giao diện (headless=False)**, tự tay quan sát:

```bash
python inspect_site.py
```

Script này sẽ:
1. Mở `https://vbpl.vn/van-ban/trung-uong`
2. Gõ từ khóa "thuế thu nhập doanh nghiệp" vào ô tìm kiếm
3. Dừng lại (không đóng trình duyệt) để bạn F12 mở DevTools, xem:
   - Selector thực của ô input tìm kiếm, dropdown "Loại văn bản", nút "Tìm kiếm"
   - Selector của từng dòng kết quả (thường là `<tr>` hoặc `<div class="item">`)
   - Tab Network: tìm request XHR/Fetch trả JSON (nếu có, đây là cách tối ưu nhất — gọi thẳng API, bỏ qua Playwright)

Nếu selector trong code mẫu (`src/search_client.py`) không khớp, sửa lại các hằng số `SELECTOR_*` ở đầu file cho khớp với những gì bạn quan sát được.

### BƯỚC 4: Cấu hình tham số tìm kiếm

Mở `config.py`, chỉnh:
- `KEYWORD`: từ khóa tìm kiếm (mặc định: "thuế thu nhập doanh nghiệp")
- `DOCUMENT_TYPES`: danh sách loại văn bản cần lấy — mặc định `["Luật", "Nghị định", "Thông tư", "Quyết định"]`
- `TOP_N`: số văn bản gần nhất mỗi loại (mặc định 3)
- `OUTPUT_DIR`: thư mục lưu kết quả

### BƯỚC 5: Chạy agent

```bash
python scraper_agent.py --keyword "thuế thu nhập doanh nghiệp" \
                         --doc-types "Nghị định,Thông tư,Luật,Quyết định" \
                         --top-n 3 \
                         --output-dir ./data \
                         --headless true
```

Agent sẽ tự động:
1. Với mỗi loại văn bản → mở trình duyệt, tìm kiếm, lọc loại, sắp xếp mới nhất → lấy N link đầu tiên
2. Với mỗi link → tải trang chi tiết (`requests`), parse metadata + link file đính kèm
3. Tải file PDF/DOC về `data/pdf/{loai_van_ban}/`
4. Trích xuất text (nếu PDF: dùng `pdfplumber` để đọc trực tiếp, có OCR fallback nếu cần) → lưu `.txt` vào `data/text/{loai_van_ban}/`
5. Ghi toàn bộ metadata (số hiệu, ngày ban hành, ngày hiệu lực, link gốc, đường dẫn file local) vào `data/metadata.json`

### BƯỚC 6: Kiểm tra kết quả

```bash
cat data/metadata.json | python -m json.tool | head -50
ls -la data/pdf/thong_tu/
ls -la data/text/thong_tu/
```

### BƯỚC 7 (tùy chọn): Đưa vào pipeline RAG đã thiết kế

Output của tool này (`data/metadata.json` + file PDF + text) khớp thẳng với **Flow 2 — Knowledge & RAG Governance** đã thiết kế trước đó:
- `metadata.json` → input cho bước "Source Ingestion"
- File `.txt` → input cho bước "Parse & Normalize" (bóc tách Chương/Điều/Khoản)
- File PDF gốc → lưu trữ làm bằng chứng gốc, phục vụ Approval Review (Admin đối chiếu bản bóc tách với bản gốc)

---

## PHẦN 3: CHI TIẾT KỸ THUẬT TỪNG MODULE

### 3.1. `config.py` — Cấu hình trung tâm

Chứa toàn bộ tham số có thể chỉnh: từ khóa, danh sách loại văn bản cần cào, số lượng top-N, đường dẫn output, timeout, delay giữa các request, User-Agent.

### 3.2. `src/models.py` — Data class

`LegalDocument`: số hiệu, tiêu đề, loại văn bản, cơ quan ban hành, ngày ban hành, ngày hiệu lực, tình trạng hiệu lực, URL trang chi tiết, danh sách attachment (tên file, URL, đường dẫn local sau khi tải), nội dung text đã trích xuất.

### 3.3. `src/search_client.py` — Tìm kiếm (Playwright)

- Mở trình duyệt Chromium headless
- Điều hướng tới `https://vbpl.vn/van-ban/trung-uong`
- Nhập từ khóa vào ô tìm kiếm, chọn filter "Loại văn bản"
- Đợi kết quả render xong (`page.wait_for_selector`)
- Đảm bảo sắp xếp "Từ mới đến cũ" (mặc định của trang)
- Lấy N dòng kết quả đầu tiên: trích tiêu đề + URL trang chi tiết + ngày ban hành hiển thị nhanh
- Đóng trình duyệt sau khi lấy đủ danh sách link (không giữ browser mở suốt để tiết kiệm RAM)

**Điểm quan trọng**: code có cơ chế `try/except` bắt lỗi nếu structure trang thay đổi, và log ra `logs/` để dễ debug thay vì crash toàn bộ.

### 3.4. `src/detail_scraper.py` — Lấy chi tiết văn bản (requests)

- Dùng `requests.get()` thuần (trang chi tiết vbpl.vn có SSR — không cần Playwright)
- Parse bằng `BeautifulSoup` + `lxml`
- Trích: số hiệu, trích yếu/tiêu đề đầy đủ, cơ quan ban hành, ngày ban hành, ngày hiệu lực, tình trạng hiệu lực, toàn văn nội dung (nếu trang hiển thị trực tiếp), và danh sách link file đính kèm (`.pdf`, `.doc`, `.docx`)

### 3.5. `src/file_downloader.py` — Tải file

- Dùng `requests.get(stream=True)` để tải file lớn không tràn RAM
- Đặt tên file theo chuẩn: `{loai_van_ban}_{so_hieu_sanitized}.pdf`
- Retry tự động 3 lần nếu lỗi mạng (dùng thư viện `tenacity`)
- Kiểm tra `Content-Type` trước khi lưu để tránh lưu nhầm trang lỗi 404 thành file PDF rỗng

### 3.6. `src/storage.py` — Trích xuất text & lưu trữ

- Nếu trang chi tiết có sẵn text (thường có) → dùng luôn, không cần OCR
- Nếu chỉ có PDF (một số văn bản cũ dạng scan) → dùng `pdfplumber` trích text; nếu PDF là ảnh scan không có text layer, script sẽ đánh dấu `"ocr_required": true` trong metadata để xử lý sau (OCR nằm ngoài phạm vi bản này, đã thiết kế ở Flow 2)
- Ghi toàn bộ document ra `metadata.json` dạng list, mỗi lần chạy sẽ merge với dữ liệu cũ (không ghi đè), dùng `so_hieu` làm khóa chống trùng

### 3.7. `scraper_agent.py` — CLI chính

Entry point, nhận tham số dòng lệnh, điều phối toàn bộ pipeline theo thứ tự: Search → Detail → Download → Extract → Save. Có thanh tiến trình (`tqdm`) hiển thị % hoàn thành.

### 3.8. `inspect_site.py` — Công cụ hỗ trợ debug

Mở trình duyệt **có giao diện** (headless=False) và giữ nguyên để bạn tự soi cấu trúc HTML thực tế, dùng khi selector trong `search_client.py` không còn đúng do trang web thay đổi giao diện.

---

## PHẦN 4: RỦI RO & PHƯƠNG ÁN DỰ PHÒNG

| Rủi ro | Ảnh hưởng | Phương án |
|---|---|---|
| Trang vbpl.vn đổi giao diện (SPA framework hay đổi CSS class) | Selector Playwright fail | Chạy `inspect_site.py`, cập nhật `SELECTOR_*` trong `config.py` |
| Trang chặn bot bằng Cloudflare/captcha | Request bị chặn | Thêm `playwright-stealth`, giảm tốc độ, hoặc chạy với `headless=False` + proxy dân dụng nếu cần |
| PDF là bản scan ảnh (văn bản cũ trước 2015) | Không trích được text | Cắm thêm OCR (`pytesseract` + `pdf2image`) — đã có sẵn khung `ocr_required` flag để plug vào sau |
| Số lượng văn bản trả về cho 1 loại < 3 (ví dụ ít Luật mới) | Thiếu dữ liệu | Script log warning, không lỗi, tiếp tục các loại khác |
| Tên file trùng khi 2 văn bản có cùng số hiệu khác năm | Ghi đè nhầm | Dùng slug gồm cả năm ban hành trong tên file |
| Site rate-limit / chặn IP nếu cào quá nhanh | Bị block tạm thời | Mặc định delay 2-5s ngẫu nhiên giữa các request, có thể tăng trong `config.py` |

---

## PHẦN 5: CHECKLIST TRIỂN KHAI

```
□ Tạo cấu trúc thư mục (Bước 1)
□ Cài Python 3.10+, tạo venv
□ pip install -r requirements.txt
□ playwright install chromium + install-deps
□ Chạy inspect_site.py, xác minh/sửa selector nếu cần
□ Chỉnh config.py: keyword, doc types, top_n
□ Chạy thử với --top-n 1 --doc-types "Thông tư" (test nhanh 1 văn bản trước)
□ Kiểm tra data/metadata.json, data/pdf/, data/text/ có đúng không
□ Nếu OK, chạy full: --top-n 3 --doc-types "Nghị định,Thông tư,Luật,Quyết định"
□ Review log file trong logs/ để xem có warning/error nào không
□ (Optional) Nối vào pipeline RAG Flow 2 đã thiết kế
```

---

## PHẦN 6: THỜI GIAN ƯỚC TÍNH

| Công việc | Thời gian |
|---|---|
| Setup môi trường (venv, packages, Playwright browser) | 15-20 phút |
| Xác minh selector qua inspect_site.py | 15-30 phút (lần đầu) |
| Chạy thử nghiệm (1 loại, 1 văn bản) | 5 phút |
| Chạy full (4 loại × 3 văn bản = 12 văn bản) | 5-10 phút (có delay lịch sự) |
| Review & xử lý lỗi phát sinh | 15-30 phút |
| **Tổng** | **~1-1.5 giờ cho lần chạy đầu tiên** |

Các lần chạy sau (định kỳ hàng tháng, giống Flow 2 "Scheduled Crawl") sẽ nhanh hơn nhiều vì selector đã được xác minh, chỉ cần chạy `scraper_agent.py` trực tiếp.

