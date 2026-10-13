# VBPL Scraper – Hướng dẫn sử dụng

Công cụ thu thập, xử lý và xuất dữ liệu văn bản pháp luật liên quan đến **Thuế Thu nhập doanh nghiệp (TNDN)** từ hai nguồn:

- **VBPL:** Cơ sở dữ liệu văn bản pháp luật – `vbpl.vn`
- **MOF:** Bộ Tài chính – `vbpq.mof.gov.vn`

Hệ thống hỗ trợ thu thập metadata, tải văn bản đính kèm, trích xuất nội dung, phân tách cấu trúc Điều/Khoản và xuất dữ liệu JSON phục vụ quá trình ingestion vào Backend hoặc hệ thống Legal RAG.

---

## 1. Chuẩn bị môi trường

Tất cả lệnh được thực hiện trong thư mục `crawler`.

```powershell
cd crawler
```

**Lệnh chính:**

```powershell
python scraper_agent.py [OPTIONS]
```

### Các tham số thường dùng

| Tham số              | Mô tả                                            |
| -------------------- | ------------------------------------------------ |
| `--all`              | Thu thập toàn bộ kết quả theo điều kiện tìm kiếm |
| `--sources`          | Chọn nguồn: `vbpl`, `mof` hoặc `vbpl,mof`        |
| `--top-n N`          | Giới hạn N văn bản mới nhất của mỗi loại         |
| `--export`           | Xuất dữ liệu JSON sau khi crawl                  |
| `--export-only`      | Chỉ xuất lại dữ liệu đã crawl                    |
| `--count-only`       | Đếm số lượng văn bản, không lưu dữ liệu          |
| `--keyword`          | Tìm kiếm theo một từ khóa                        |
| `--keywords-file`    | Đọc bộ từ khóa từ file TOML                      |
| `--doc-types`        | Chỉ định loại văn bản cần thu thập               |
| `--headless false`   | Hiển thị trình duyệt khi crawl                   |
| `--skip-download`    | Không tải file PDF/DOC                           |
| `--no-ocr`           | Tắt xử lý OCR                                    |
| `--no-skip-existing` | Crawl lại các văn bản đã tồn tại                 |
| `--run-dir`          | Chỉ định thư mục lượt crawl                      |
| `--purge-invalid`    | Xóa metadata không hợp lệ                        |

---

## 2. Thu thập dữ liệu (Crawling)

### 2.1. Crawl toàn bộ dữ liệu

Thu thập tất cả văn bản liên quan đến thuế TNDN từ VBPL và Bộ Tài chính, xử lý cấu trúc Điều/Khoản và xuất dữ liệu.

**Cả hai nguồn:**

```powershell
python scraper_agent.py --all --sources vbpl,mof --export
```

**Chỉ VBPL:**

```powershell
python scraper_agent.py --all --sources vbpl --export
```

**Chỉ Bộ Tài chính:**

```powershell
python scraper_agent.py --all --sources mof --export
```

### 2.2. Crawl dữ liệu định kỳ

Phù hợp với việc thu thập các văn bản mới mà không cần duyệt toàn bộ dữ liệu.

**Lấy 3 văn bản mới nhất của mỗi loại:**

```powershell
python scraper_agent.py --top-n 3 --sources vbpl,mof --export
```

**Lấy 10 văn bản mới nhất của mỗi loại:**

```powershell
python scraper_agent.py --top-n 10 --sources vbpl,mof --export
```

### 2.3. Crawl theo từ khóa đơn

```powershell
python scraper_agent.py --all --keyword "thuế thu nhập doanh nghiệp" --sources vbpl,mof --export
```

### 2.4. Crawl theo loại văn bản

Chỉ thu thập các loại văn bản được chỉ định:

```powershell
python scraper_agent.py --all --doc-types "Luật,Nghị định,Thông tư,Quyết định" --sources vbpl,mof --export
```

---

## 3. Crawl theo bộ từ khóa TOML

Hệ thống hỗ trợ thu thập dữ liệu theo danh sách từ khóa được cấu hình trong:

```text
keywords/thue_tndn.toml
```

### 3.1. Nhóm từ khóa

| Nhóm         | Mục đích                                         | Trạng thái |
| ------------ | ------------------------------------------------ | ---------- |
| `core`       | Từ khóa cốt lõi liên quan đến thuế TNDN          | Bật        |
| `topic`      | Các chủ đề liên quan                             | Bật        |
| `seeds`      | Danh sách số hiệu văn bản cần thu thập chắc chắn | Bật        |
| `contractor` | Nhóm từ khóa bổ sung                             | Tắt        |

**Cơ chế lọc:**

- Mỗi từ khóa được tìm kiếm qua toàn bộ trang kết quả.
- Chỉ giữ văn bản có tên chứa cụm từ khóa tương ứng.
- Riêng nhóm `core` hỗ trợ đối chiếu alias.
- Cơ chế lọc chặt hơn nhằm hạn chế kết quả không liên quan do công cụ tìm kiếm của hai website khớp từ khóa khá lỏng.

### 3.2. Đếm dữ liệu trước khi crawl

Ước lượng số văn bản phù hợp mà không lưu dữ liệu:

```powershell
python scraper_agent.py --count-only --sources vbpl,mof --keywords-file keywords/thue_tndn.toml
```

### 3.3. Crawl toàn bộ bộ từ khóa

```powershell
python scraper_agent.py --sources vbpl,mof --keywords-file keywords/thue_tndn.toml
```

**Lưu ý:**

- Quá trình có thể kéo dài nhiều giờ.
- Nếu bị gián đoạn, chạy lại cùng câu lệnh.
- Công cụ sẽ bỏ qua văn bản đã có trong các lượt crawl trước.
- `metadata.json` được lưu sau mỗi từ khóa.

### 3.4. Export sau khi crawl

```powershell
python scraper_agent.py --export-only
```

### 3.5. Báo cáo và truy vết từ khóa

Hệ thống tạo file `keyword_report.json`, thống kê theo từng từ khóa:

| Trường     | Ý nghĩa                                     |
| ---------- | ------------------------------------------- |
| `listed`   | Số văn bản xuất hiện trong kết quả tìm kiếm |
| `matched`  | Số văn bản vượt qua bộ lọc từ khóa          |
| `new`      | Số văn bản mới                              |
| `existing` | Số văn bản đã tồn tại                       |

Mỗi văn bản được bổ sung:

- `matched_keywords`: Danh sách từ khóa đã khớp.
- `keyword_groups`: Nhóm từ khóa tương ứng.

Các trường này cũng xuất hiện trong dữ liệu export để hỗ trợ kiểm duyệt và truy vết nguồn thu thập.

### 3.6. Lưu ý về nhóm Seeds và Topic

**Nhóm `seeds`:**

- Sử dụng `[seeds].so_hieu` để chỉ định số hiệu văn bản bắt buộc thu thập.
- Ví dụ: văn bản ban hành mẫu `03/TNDN`.
- VBPL hỗ trợ tìm kiếm theo số hiệu tốt hơn.
- MOF có thể không trả về đúng văn bản khi tìm theo số hiệu.

**Nhóm `topic`:**

Có khả năng thu thập văn bản nằm ngoài phạm vi thuế TNDN. Cần kiểm duyệt kỹ trước khi đưa vào Knowledge Base.

### 3.7. Ghi đè cấu hình và crawl lại

`--doc-types` ghi đè cấu hình loại văn bản của tất cả nhóm từ khóa.

`--no-skip-existing` cho phép crawl lại cả các văn bản đã có.

---

## 4. Kiểm tra và chạy thử

### 4.1. Chỉ đếm tài liệu (Count Only)

```powershell
python scraper_agent.py --count-only --sources vbpl,mof
```

Công cụ duyệt toàn bộ trang kết quả và thống kê:

1. Tổng số văn bản từ VBPL.
2. Tổng số văn bản từ MOF.
3. Số văn bản MOF trùng VBPL.
4. Tổng số văn bản dự kiến lưu vào metadata sau loại trùng.

**Quy tắc phát hiện trùng lặp:**

Văn bản MOF được xem là trùng VBPL nếu có cùng số hiệu văn bản sau chuẩn hóa.

Chế độ này **không so sánh toàn văn hoặc file hash**.

**Không tạo hoặc lưu:**

- Lượt crawl mới.
- `metadata.json`.
- HTML thô.
- PDF/DOC.
- Text.
- Dữ liệu export.

### 4.2. Chạy trình duyệt có giao diện

Dùng để quan sát quá trình crawl hoặc debug.

```powershell
python scraper_agent.py --top-n 1 --sources vbpl --headless false
```

### 4.3. Không tải PDF/DOC

Chỉ thu thập metadata và nội dung HTML.

```powershell
python scraper_agent.py --top-n 3 --sources vbpl --skip-download
```

Phù hợp khi cần kiểm tra nhanh dữ liệu mà không tải file đính kèm.

### 4.4. Tắt OCR

```powershell
python scraper_agent.py --all --sources vbpl,mof --no-ocr --export
```

Chế độ này bỏ qua bước OCR trong quá trình xử lý tài liệu.

---

## 5. Export dữ liệu

### 5.1. Export lượt crawl mới nhất

```powershell
python scraper_agent.py --export-only
```

### 5.2. Export lượt crawl cụ thể

```powershell
python scraper_agent.py --export-only --run-dir data/2026-10-11/run-083015
```

Export tạo payload JSON phục vụ quá trình ingestion vào Backend hoặc hệ thống Legal RAG.

---

## 6. Dọn dẹp metadata

### 6.1. Xử lý lượt crawl mới nhất

```powershell
python scraper_agent.py --purge-invalid
```

### 6.2. Xử lý lượt crawl cụ thể

```powershell
python scraper_agent.py --purge-invalid --run-dir data/2026-10-11/run-083015
```

Chức năng này dùng để loại bỏ metadata không hợp lệ.

---

## 7. Chạy kiểm thử

Chạy toàn bộ test trong thư mục `tests`:

```powershell
python -m pytest tests -q
```

---

## 8. Cấu trúc dữ liệu đầu ra

### 8.1. Tổng quan

```text
crawler/
├── scraper_agent.py
├── keywords/
│   └── thue_tndn.toml
├── tests/
└── data/
    ├── YYYY-MM-DD/
    │   └── run-HHMMSS/
    │       ├── metadata.json
    │       ├── keyword_report.json
    │       ├── raw_html/
    │       ├── pdf/
    │       └── text/
    └── export/
        ├── vbpl/
        ├── mof/
        └── manifest.json
```

Mỗi lần crawl mới, chương trình tạo một thư mục riêng theo thời gian thực thi:

```text
data/YYYY-MM-DD/run-HHMMSS/
```

Nếu có hai lượt crawl trong cùng một giây, hệ thống tự động thêm hậu tố:

```text
run-HHMMSS-02
```

### 8.2. Metadata và Index

**Đường dẫn:**

```text
data/YYYY-MM-DD/run-HHMMSS/metadata.json
```

Chứa danh sách văn bản đã thu thập, hợp nhất và chuẩn hóa.

Các trường dữ liệu tiêu biểu:

| Trường             | Nội dung                       |
| ------------------ | ------------------------------ |
| `doc_id`           | Định danh văn bản              |
| `detail_url`       | URL trang chi tiết văn bản     |
| `noi_dung_text`    | Nội dung văn bản đã trích xuất |
| `attachments`      | Danh sách file đính kèm        |
| `matched_keywords` | Các từ khóa phù hợp            |
| `keyword_groups`   | Nhóm từ khóa tương ứng         |

### 8.3. Nội dung văn bản (Text)

**VBPL:**

```text
data/YYYY-MM-DD/run-HHMMSS/text/vbpl/<loai>/slug_so_hieu.txt
```

**MOF:**

```text
data/YYYY-MM-DD/run-HHMMSS/text/mof/<loai>/slug_so_hieu.txt
```

Nội dung:

- Text trích xuất từ HTML hoặc PDF.
- Header chứa thông tin metadata của văn bản.

### 8.4. File đính kèm

**VBPL:**

```text
data/YYYY-MM-DD/run-HHMMSS/pdf/vbpl/<loai>/
```

**MOF:**

```text
data/YYYY-MM-DD/run-HHMMSS/pdf/mof/<loai>/
```

Lưu các file PDF/DOC được tải từ nguồn tương ứng (nếu có).

### 8.5. HTML thô

```text
data/YYYY-MM-DD/run-HHMMSS/raw_html/vbpl/<loai>/
```

Lưu HTML trang chi tiết khi chế độ debug hoặc lưu HTML thô được kích hoạt.

Mục đích:

- Debug quá trình scraping.
- Truy vết nội dung nguồn.
- Kiểm tra lỗi trích xuất.

### 8.6. Export JSON (Ingestion Payload)

Khác với dữ liệu crawl, thư mục export được dùng chung:

```text
data/export/
├── vbpl/
│   └── <loai>/
│       └── slug.json
├── mof/
│   └── <loai>/
│       └── slug.json
└── manifest.json
```

**Mỗi văn bản được xuất thành một file JSON** với các thành phần chính:

| Thành phần           | Vai trò                                                |
| -------------------- | ------------------------------------------------------ |
| `legal_source`       | Thông tin nguồn pháp lý                                |
| `knowledge_document` | Thông tin văn bản tri thức                             |
| `chunks`             | Các đoạn nội dung được phân tách theo cấu trúc pháp lý |

**File `manifest.json`** tổng hợp trạng thái export:

| Trường         | Mô tả                                     |
| -------------- | ----------------------------------------- |
| `parse_status` | Trạng thái phân tích văn bản              |
| `articles`     | Thông tin hoặc số lượng Điều đã phân tích |
| `chunks`       | Thông tin hoặc số lượng chunk             |
| `warnings`     | Các cảnh báo trong quá trình xử lý        |

---

## 9. Quy trình sử dụng đề xuất

### Trường hợp A – Thu thập dữ liệu lần đầu

```powershell
# 1. Chuyển đến thư mục crawler
cd crawler

# 2. Ước lượng số lượng tài liệu
python scraper_agent.py --count-only --sources vbpl,mof --keywords-file keywords/thue_tndn.toml

# 3. Crawl theo bộ từ khóa
python scraper_agent.py --sources vbpl,mof --keywords-file keywords/thue_tndn.toml

# 4. Export dữ liệu
python scraper_agent.py --export-only
```

### Trường hợp B – Thu thập dữ liệu định kỳ

```powershell
python scraper_agent.py --top-n 10 --sources vbpl,mof --export
```

### Trường hợp C – Kiểm tra crawler

```powershell
# Crawl một văn bản và hiển thị trình duyệt
python scraper_agent.py --top-n 1 --sources vbpl --headless false

# Chạy unit tests
python -m pytest tests -q
```

### Trường hợp D – Khôi phục sau gián đoạn

Chạy lại câu lệnh crawl theo bộ từ khóa:

```powershell
python scraper_agent.py --sources vbpl,mof --keywords-file keywords/thue_tndn.toml
```

Sau khi hoàn tất:

```powershell
python scraper_agent.py --export-only
```

Cơ chế bỏ qua văn bản đã tồn tại giúp tránh thu thập lại những tài liệu đã được xử lý ở các lượt trước.

---

## 10. Lưu ý vận hành

1. **Thời gian thực thi:** Crawl toàn bộ dữ liệu có thể mất nhiều giờ, tùy số lượng văn bản và tốc độ phản hồi của website nguồn.
2. **Trùng lặp:** Chế độ đếm xác định trùng lặp theo số hiệu đã chuẩn hóa, không dựa trên nội dung toàn văn.
3. **Kiểm duyệt:** Văn bản khớp nhóm từ khóa `topic` cần được kiểm tra trước khi đưa vào Knowledge Base.
4. **OCR:** Khi tắt OCR, tài liệu scan hoặc PDF dạng ảnh có thể không trích xuất được đầy đủ nội dung.
5. **Tái sử dụng dữ liệu:** Có thể dùng `--export-only` để xuất lại dữ liệu mà không cần thực hiện crawl mới.
6. **Tách biệt dữ liệu:** Dữ liệu thô được tổ chức theo từng lượt crawl, còn payload ingestion được xuất vào thư mục `data/export/` dùng chung.

---

## 11. Tóm tắt lệnh thường dùng

| Mục đích        | Lệnh                                                                                 |
| --------------- | ------------------------------------------------------------------------------------ |
| Crawl toàn bộ   | `python scraper_agent.py --all --sources vbpl,mof --export`                          |
| Crawl định kỳ   | `python scraper_agent.py --top-n 10 --sources vbpl,mof --export`                     |
| Đếm tài liệu    | `python scraper_agent.py --count-only --sources vbpl,mof`                            |
| Crawl theo TOML | `python scraper_agent.py --sources vbpl,mof --keywords-file keywords/thue_tndn.toml` |
| Export lại      | `python scraper_agent.py --export-only`                                              |
| Dọn metadata    | `python scraper_agent.py --purge-invalid`                                            |
| Chạy tests      | `python -m pytest tests -q`                                                          |

**Đầu ra cuối cùng:** Dữ liệu JSON đã chuẩn hóa và phân tách cấu trúc pháp lý, sẵn sàng chuyển sang bước ingestion của Backend hoặc hệ thống Legal RAG.
