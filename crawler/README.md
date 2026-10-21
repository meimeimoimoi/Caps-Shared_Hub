# VBPL Scraper Agent

Công cụ tự động cào văn bản pháp luật (Luật, Nghị định, Thông tư, Quyết định...)
về **Thuế Thu Nhập Doanh Nghiệp** từ [vbpl.vn](https://vbpl.vn) — Cơ sở dữ liệu
quốc gia về pháp luật (Bộ Tư pháp). Lấy **top N văn bản gần nhất cho mỗi loại**,
bao gồm cả nội dung text và file PDF/DOC gốc.

📄 Xem **[PLAN.md](./PLAN.md)** để đọc kế hoạch chi tiết đầy đủ (kiến trúc,
lý do kỹ thuật, rủi ro, checklist).

> **Vị trí trong repo:** `Caps-Shared_Hub/crawler/` — project Python độc lập, không thuộc
> solution .NET trong `BE/`. Mọi lệnh bên dưới chạy từ thư mục `crawler/`. Dữ liệu sinh ra
> (`data/`, `logs/`) không được commit; file `data/<ngày>/<lượt>/export/**/*.json` là đầu vào cho `BE/ingestion`.

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

# Khởi tạo kho dữ liệu: cào TOÀN BỘ kết quả liên quan, đi đến trang cuối
python scraper_agent.py --all --sources vbpl,mof --export

# Chỉ thống kê toàn bộ, không lưu dữ liệu crawler
python scraper_agent.py --count-only --sources vbpl,mof
```

## Kết quả sau khi chạy

```
data/
└── 2026-10-11/               # Ngày chạy crawler
    └── run-083015/            # Một lượt chạy (HHMMSS; tự thêm -02 nếu trùng giây)
        ├── metadata.json      # Chỉ chứa dữ liệu của lượt này
        ├── raw_html/
        ├── pdf/
        │   ├── thong_tu/*.pdf
        │   ├── nghi_dinh/*.pdf
        │   ├── luat/*.pdf
        │   └── quyet_dinh/*.pdf
        ├── text/
        │   ├── thong_tu/*.txt # Toàn văn đã trích, kèm header metadata
        │   ├── nghi_dinh/*.txt
        │   ├── luat/*.txt
        │   └── quyet_dinh/*.txt
        └── export/            # Payload cho Caps-Shared_Hub (xem bên dưới)
            ├── manifest.json
            └── <loai>/<so-hieu>.json
```

## Xuất dữ liệu cho Caps-Shared_Hub (tách Điều/Khoản)

Cào và chunking là **2 bước riêng**. Lệnh cào mặc định chỉ lưu text + `metadata.json`;
bước 2 tách toàn văn thành Chương → Điều → Khoản → Điểm (`src/legal_parser.py`) và ghi
`data/<ngày>/<lượt>/export/<loai>/<so-hieu>.json` (`src/exporter.py`; nguồn khác vbpl nằm trong thư mục `<nguon>/`).

```bash
python scraper_agent.py --sources vbpl,mof --top-n 3   # 1. cào
python scraper_agent.py --export-only                  # 2. tách Điều/Khoản + tạo chunk
# hoặc gộp 1 lệnh: python scraper_agent.py --export
# thêm bản Markdown: python scraper_agent.py --export-only --export-format both
```

`--export-only` mặc định xử lý lượt mới nhất. Để chọn một lượt cụ thể:

```bash
python scraper_agent.py --export-only --run-dir data/2026-10-11/run-083015
```

Mỗi file khớp schema `knowledge` của backend (`BE/ingestion/Entities`):

- `legal_source`: `document_number`, `doc_type`, `issuing_authority`, `title`
- `knowledge_document`: `source = "CRAWL_VBPL"` / `"CRAWL_MOF"`, `file_hash` (sha256 toàn văn),
  ngày ISO `YYYY-MM-DD`, `content_json` (cây Chương/Điều/units giống trang duyệt knowledge-admin)
- `chunks[]`: mỗi Khoản 1 chunk (Khoản dài > 1500 ký tự thì tách theo Điểm), có
  `article` / `clause` / `point`, `path` ("Điều 4 · Khoản 1") và `text` mở đầu bằng breadcrumb

Những chỗ đánh số bất thường được ghi `warnings` / unit `status: "WARNING"` để duyệt tay.

Unit có `references`: các Điều/Khoản/Điểm mà unit đó dẫn chiếu tới, dạng `{doc, article, clause, point}`; `doc` là `"self"` hoặc số hiệu văn bản khác. Chỉ lấy dẫn chiếu rõ ràng: "… Luật/Nghị định/Thông tư này", "khoản N Điều này", "điểm x khoản này", "… Nghị định số 08/2015/NĐ-CP". Bỏ "khoản N Điều M" không ghi văn bản, dẫn chiếu theo tên Luật (không có số hiệu), và dẫn chiếu nằm trong đoạn trích “…” của văn bản sửa đổi.

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
| `--all` | (tắt) | Cào toàn bộ kết quả liên quan đến từ khóa cho mỗi loại; bỏ giới hạn `--top-n` và đi đến trang cuối |
| `--count-only` | (tắt) | Duyệt toàn bộ và chỉ in số lượng theo nguồn, số MOF trùng VBPL và tổng dự kiến; không lưu dữ liệu crawler |
| `--headless` | true | `false` để xem trình duyệt chạy trực tiếp (debug) |
| `--skip-download` | (tắt) | Bỏ qua tải PDF/DOC, chỉ lấy metadata + text HTML (test nhanh) |
| `--sources` | "vbpl" | Nguồn cào: `vbpl`, `mof` (vbpq.mof.gov.vn), hoặc `vbpl,mof` |
| `--no-ocr` | (tắt) | Không OCR PDF scan, chỉ đánh dấu `ocr_required` |
| `--export` | (tắt) | Cào xong tách Điều/Khoản + tạo chunk luôn |
| `--export-only` | (tắt) | Không cào: chuẩn hoá `metadata.json` của lượt mới nhất rồi tạo lại `export/` (tên cũ: `--reparse-only`) |
| `--export-format` | `json` | Định dạng cho `--export`/`--export-only`: `json` (payload BE), `md` (bản đọc Markdown) hoặc `both` |
| `--run-dir` | lượt mới nhất | Chọn lượt cũ cho `--export-only` hoặc `--purge-invalid`, ví dụ `data/2026-10-11/run-083015` |
| `--keywords-file` | (tắt) | Cào hết theo bộ từ khoá TOML (vd `keywords/thue_tndn.toml`), chỉ giữ văn bản có tên khớp; thay cho `--keyword`/`--top-n`. Xem RUN_COMMANDS.md mục 4.1 |
| `--no-skip-existing` | (tắt) | Với `--keywords-file`: không bỏ qua văn bản đã cào ở các lượt trước |
| `--no-relations` | (tắt) | Không cào thêm văn bản liên quan theo tab Lược đồ |
| `--refresh-relations` | (tắt) | Đọc lại Lược đồ của văn bản đã cào ở lượt trước thay vì dùng quan hệ đã lưu |

## Văn bản liên quan (tab Lược đồ)

Mỗi văn bản vbpl.vn được đọc thêm tab **Lược đồ** và lưu vào `relations` trong `metadata.json` (`code`, `type`, `direction`: `out` = văn bản này tác động lên văn bản kia, `in` = ngược lại). File export không chứa `relations`, chỉ có `related_from` và `vbhn_*`.
Sau khi cào theo từ khoá, tool cào thêm **1 bước** các văn bản có quan hệ hướng dẫn / quy định chi tiết / sửa đổi / thay thế (`FOLLOW_RELATION_CODES` trong `config.py`); căn cứ ban hành và dẫn chiếu chỉ được lưu, không cào. Văn bản lấy theo cách này có `related_from` và `matched_keywords` rỗng.
Văn bản đã cào ở lượt trước vẫn được đi theo quan hệ: dùng `relations` đã lưu hoặc `data/relations_cache.json`, thiếu thì chỉ mở tab Lược đồ. Dùng `--refresh-relations` để bắt văn bản sửa đổi mới ban hành.

## Văn bản hợp nhất (VBHN)

VBHN là bản đã ghép sẵn các sửa đổi; mỗi Điều/Khoản/Điểm bị tác động có chú thích `[n]` ghi văn bản sửa đổi và ngày hiệu lực.

- Mỗi văn bản vbpl lưu `vbhn`: các VBHN đã gộp nó (đọc cùng lúc với tab Lược đồ).
- Tool cào thêm (1 bước, `related_from.relation = "hop_nhat"`) VBHN **mới nhất** mà văn bản là **văn bản gốc**: văn bản có ngày ban hành sớm nhất trong `merged`. Luật sửa nhiều luật xuất hiện trong VBHN của từng luật bị sửa, nhưng không phải văn bản gốc của các VBHN đó.
- Khi tách VBHN, marker `[n]` được gỡ khỏi text và chuyển thành `amendments` của unit (`type`, `source_number`, `effective_from`, `text`). Marker ở tiêu đề Điều áp dụng cho mọi unit của Điều đó; marker ở tiêu đề hoặc phần mở đầu nằm trong `content_json.document_notes`.
- Export của VBHN có `knowledge_document.metadata.vbhn_effective_from` (vbpl không ghi ngày hiệu lực cho VBHN, nên lấy ngày hiệu lực muộn nhất trong các chú thích).
- Export của văn bản gốc có `vbhn_latest`, `vbhn_outdated` và `vbhn_missing`: các văn bản sửa đổi một phần (Lược đồ mã 10, chiều vào) mà VBHN mới nhất chưa gộp, cần đọc kèm cho tới khi có VBHN mới.

## Lưu ý đạo đức & pháp lý khi cào dữ liệu

- vbpl.vn là cổng thông tin **công khai** của nhà nước, không có paywall, không yêu cầu đăng nhập.
- Tool có delay lịch sự (2-5s) giữa các request để không gây tải cho server.
- Khi đưa dữ liệu vào hệ thống RAG, luôn giữ nguyên trích dẫn nguồn (số hiệu, ngày ban hành) — đã đóng gói sẵn trong `metadata.json` và header của mỗi file `.txt`.
