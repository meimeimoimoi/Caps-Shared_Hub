# VBPL Scraper Agent

Công cụ tự động cào văn bản pháp luật (Luật, Nghị định, Thông tư, Quyết định...)
về **Thuế Thu Nhập Doanh Nghiệp** từ [vbpl.vn](https://vbpl.vn) — Cơ sở dữ liệu
quốc gia về pháp luật (Bộ Tư pháp). Lấy **top N văn bản gần nhất cho mỗi loại**,
bao gồm cả nội dung text và file PDF/DOC gốc.

📄 Xem **[PLAN.md](./PLAN.md)** để đọc kế hoạch chi tiết đầy đủ (kiến trúc,
lý do kỹ thuật, rủi ro, checklist).

> **Vị trí trong repo:** `Caps-Shared_Hub/crawler/` — project Python độc lập, không thuộc
> solution .NET trong `BE/`. Mọi lệnh bên dưới chạy từ thư mục `crawler/`. Dữ liệu sinh ra
> (`data/`, `logs/`) không được commit; file `data/export/**/*.json` là đầu vào cho `BE/ingestion`.

---

## Quick Start

```bash
# 1. Cài đặt môi trường
cd crawler
python3 -m venv venv
source venv/bin/activate                 # Windows: venv\Scripts\activate
pip install -r requirements.txt
playwright install chromium
playwright install-deps chromium         # Linux only

# 2. (BẮT BUỘC lần đầu) Xác minh selector còn đúng với giao diện hiện tại
python inspect_site.py

# 3. Chạy thử nghiệm nhanh (1 loại, 1 văn bản, có cửa sổ trình duyệt để xem)
python scraper_agent.py --doc-types "Thông tư" --top-n 1 --headless false

# 4. Nếu OK, chạy đầy đủ
python scraper_agent.py \
    --keyword "thuế thu nhập doanh nghiệp" \
    --doc-types "Nghị định,Thông tư,Luật,Quyết định" \
    --top-n 3 \
    --headless true
```

## Kết quả sau khi chạy

```
data/
├── metadata.json              # Index đầy đủ: số hiệu, ngày ban hành, hiệu lực, link...
├── pdf/
│   ├── thong_tu/*.pdf
│   ├── nghi_dinh/*.pdf
│   ├── luat/*.pdf
│   └── quyet_dinh/*.pdf
├── text/
│   ├── thong_tu/*.txt          # Toàn văn đã trích, kèm header metadata
│   ├── nghi_dinh/*.txt
│   ├── luat/*.txt
│   └── quyet_dinh/*.txt
└── export/                     # Payload cho Caps-Shared_Hub (xem bên dưới)
    ├── manifest.json
    └── <loai>/<so-hieu>.json
```

## Xuất dữ liệu cho Caps-Shared_Hub (tách Điều/Khoản)

Cào và chunking là **2 bước riêng**. Lệnh cào mặc định chỉ lưu text + `metadata.json`;
bước 2 tách toàn văn thành Chương → Điều → Khoản → Điểm (`src/legal_parser.py`) và ghi
`data/export/<loai>/<so-hieu>.json` (`src/exporter.py`; nguồn khác vbpl nằm ở `data/export/<nguon>/...`).

```bash
python scraper_agent.py --sources vbpl,mof --top-n 3   # 1. cào
python scraper_agent.py --export-only                  # 2. tách Điều/Khoản + tạo chunk
# hoặc gộp 1 lệnh: python scraper_agent.py --export
```

Mỗi file khớp schema `knowledge` của backend (`BE/ingestion/Entities`):

- `legal_source`: `document_number`, `doc_type`, `issuing_authority`, `title`
- `knowledge_document`: `source = "CRAWL_VBPL"` / `"CRAWL_MOF"`, `file_hash` (sha256 toàn văn),
  ngày ISO `YYYY-MM-DD`, `content_json` (cây Chương/Điều/units giống trang duyệt knowledge-admin)
- `chunks[]`: mỗi Khoản 1 chunk (Khoản dài > 1500 ký tự thì tách theo Điểm), có
  `article` / `clause` / `point`, `path` ("Điều 4 · Khoản 1") và `text` mở đầu bằng breadcrumb

Những chỗ đánh số bất thường được ghi `warnings` / unit `status: "WARNING"` để duyệt tay.

```bash
# Test bộ tách
pip install pytest
python -m pytest tests -q
```

Lưu ý backend: ràng buộc `ck_kd_source` trong `BE/SHFT_PostgreSQL.sql` hiện chỉ cho
`CRAWL_VBPL`/`MANUAL_UPLOAD` → cần thêm `CRAWL_MOF` khi làm API ingestion.

## Nguồn vbpq.mof.gov.vn (Bộ Tài chính) + OCR

`--sources mof` cào CSDL văn bản QPPL ngành tài chính qua API JSON công khai
(`src/mof_client.py`), lọc các văn bản có **trích yếu chứa nguyên cụm từ khoá**.
Trang không có toàn văn dạng text: văn bản từ 2021 chỉ có **PDF scan**, nên tool OCR
tiếng Việt (`src/ocr.py`, text_source = `pdf_ocr`). Text OCR có thể sai chính tả — cần duyệt lại.

Cài OCR (một lần):
1. `pip install -r requirements.txt` (pytesseract, pypdfium2)
2. Cài Tesseract cho Windows (bản UB-Mannheim), tích chọn gói ngôn ngữ **Vietnamese**
3. Nếu không cài vào `C:\Program Files\Tesseract-OCR\`, đặt biến môi trường `TESSERACT_CMD`

Chưa cài Tesseract thì tool vẫn chạy: văn bản được đánh dấu `ocr_required: true`.
Dùng `--no-ocr` để bỏ qua OCR cho nhanh.

## ⚠️ Nếu scraper không chạy đúng (0 kết quả / lỗi selector)

Giao diện vbpl.vn có thể thay đổi theo thời gian. Chạy lại:

```bash
python inspect_site.py
```

Trình duyệt sẽ mở lên (có giao diện), tự động gõ từ khóa. Dùng F12 (DevTools)
kiểm tra selector thực tế của ô tìm kiếm, dropdown loại văn bản, và từng dòng
kết quả — rồi cập nhật lại giá trị trong `config.py` (mục `SELECTORS`).

Xem thêm phần "PHẦN 4: RỦI RO & PHƯƠNG ÁN DỰ PHÒNG" trong `PLAN.md`.

## Cơ chế hoạt động (Cách cào)

Hệ thống được thiết kế tối ưu với 3 giai đoạn (Pipeline):

**1. Giai đoạn 1: Tìm kiếm & Tải file (Playwright - Trình duyệt ảo)**
- vbpl.vn là một Single Page Application (SPA) viết bằng Next.js/React. Nội dung không có sẵn trong HTML ban đầu mà được render bằng JavaScript. Hơn nữa, việc chuyển trang thường dùng `React Router pushState` thay vì reload thực sự.
- Code dùng Playwright để mở trình duyệt, gõ từ khóa, chọn filter loại văn bản (vd: Nghị định).
- **Trích xuất URL & Tải file tích hợp**:
  - Code đọc trực tiếp thẻ `<a>` nếu có.
  - Nếu thẻ <a> bị ẩn đi bằng sự kiện `onClick`, code sẽ click vào tiêu đề văn bản và đợi URL thay đổi (`wait_for_url`) để bắt được URL trang chi tiết thực sự.
  - Lấy URL chi tiết xong, code sẽ tìm nút "PDF" hoặc "DOC" ngay trong card (hoặc trên trang) để giả lập thao tác click tải file đính kèm.
  - Cuối cùng gọi lệnh `page.go_back()` để quay lại danh sách và tiếp tục với item tiếp theo (Giúp tiết kiệm tài nguyên khi dùng 1 Session trình duyệt cho mọi tác vụ).

**2. Giai đoạn 2: Cào Metadata chi tiết (Requests + BeautifulSoup)**
- Dùng danh sách URL thực đã lấy được, scraper chuyển sang dùng `requests` thuần túy (rất nhanh) để lấy nội dung HTML của từng trang văn bản.
- `BeautifulSoup` phân tích bảng (table) thuộc tính để lấy ra các trường: *Cơ quan ban hành, Số hiệu, Ngày ban hành, Tình trạng hiệu lực*,...

**3. Giai đoạn 3: Trích Text & Lưu trữ**
- Dọn dẹp HTML toàn văn thành văn bản thuần (`.txt`) giữ nguyên cấu trúc (Điều, Khoản).
- Tổng hợp thành file `metadata.json` chứa thông tin toàn văn + đường dẫn tham chiếu đến các file PDF/DOC đã tải ở Giai đoạn 1.

## Tham số CLI

| Tham số | Mặc định | Mô tả |
|---|---|---|
| `--keyword` | "thuế thu nhập doanh nghiệp" | Từ khóa tìm kiếm |
| `--doc-types` | "Luật,Nghị định,Thông tư,Quyết định" | Danh sách loại văn bản, cách nhau bởi dấu phẩy |
| `--top-n` | 3 | Số văn bản gần nhất mỗi loại |
| `--headless` | true | `false` để xem trình duyệt chạy trực tiếp (debug) |
| `--skip-download` | (tắt) | Bỏ qua tải PDF/DOC, chỉ lấy metadata + text HTML (test nhanh) |
| `--sources` | "vbpl" | Nguồn cào: `vbpl`, `mof` (vbpq.mof.gov.vn), hoặc `vbpl,mof` |
| `--no-ocr` | (tắt) | Không OCR PDF scan, chỉ đánh dấu `ocr_required` |
| `--export` | (tắt) | Cào xong tách Điều/Khoản + tạo chunk luôn |
| `--export-only` | (tắt) | Không cào: chuẩn hoá `metadata.json` hiện có rồi tạo lại `data/export/` (tên cũ: `--reparse-only`) |

## Lưu ý đạo đức & pháp lý khi cào dữ liệu

- vbpl.vn là cổng thông tin **công khai** của nhà nước, không có paywall, không yêu cầu đăng nhập.
- Tool có delay lịch sự (2-5s) giữa các request để không gây tải cho server.
- Khi đưa dữ liệu vào hệ thống RAG, luôn giữ nguyên trích dẫn nguồn (số hiệu, ngày ban hành) — đã đóng gói sẵn trong `metadata.json` và header của mỗi file `.txt`.
