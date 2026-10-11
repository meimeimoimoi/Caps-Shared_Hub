# Các lệnh chạy VBPL Scraper

Chạy các lệnh bên dưới từ thư mục `crawler`:

```powershell
cd crawler
```

## 1. Cào toàn bộ dữ liệu

Cào tất cả văn bản liên quan đến thuế thu nhập doanh nghiệp từ VBPL và Bộ Tài chính, sau đó tách Điều/Khoản và tạo dữ liệu export:

```powershell
python scraper_agent.py --all --sources vbpl,mof --export
```

Chỉ cào toàn bộ từ VBPL:

```powershell
python scraper_agent.py --all --sources vbpl --export
```

Chỉ cào toàn bộ từ Bộ Tài chính:

```powershell
python scraper_agent.py --all --sources mof --export
```

## 2. Cào dữ liệu định kỳ

Lấy 3 văn bản mới nhất của mỗi loại:

```powershell
python scraper_agent.py --top-n 3 --sources vbpl,mof --export
```

Lấy 10 văn bản mới nhất của mỗi loại:

```powershell
python scraper_agent.py --top-n 10 --sources vbpl,mof --export
```

## 3. Chỉ đếm toàn bộ tài liệu, không lưu dữ liệu

Duyệt tất cả trang và in thống kê số tài liệu của VBPL, MOF, số tài liệu MOF trùng VBPL và tổng số dự kiến lưu vào metadata:

```powershell
python scraper_agent.py --count-only --sources vbpl,mof
```

Chế độ này không tạo lượt cào và không lưu `metadata.json`, `raw_html`, PDF, text hoặc export. Tài liệu MOF được xem là trùng VBPL khi có cùng **số hiệu văn bản sau chuẩn hóa**; tool không so sánh toàn văn hoặc file hash trong chế độ đếm.

## 4. Thay đổi từ khóa

```powershell
python scraper_agent.py --all --keyword "thuế thu nhập doanh nghiệp" --sources vbpl,mof --export
```

## 5. Chọn loại văn bản

```powershell
python scraper_agent.py --all --doc-types "Luật,Nghị định,Thông tư,Quyết định" --sources vbpl,mof --export
```

## 6. Chạy trình duyệt có giao diện

Dùng khi cần quan sát hoặc kiểm tra crawler:

```powershell
python scraper_agent.py --top-n 1 --sources vbpl --headless false
```

## 7. Không tải PDF/DOC

Chỉ lấy metadata và nội dung HTML để kiểm tra nhanh:

```powershell
python scraper_agent.py --top-n 3 --sources vbpl --skip-download
```

## 8. Tắt OCR

```powershell
python scraper_agent.py --all --sources vbpl,mof --no-ocr --export
```

## 9. Export lại dữ liệu đã cào

Export lại lượt cào mới nhất:

```powershell
python scraper_agent.py --export-only
```

Export một lượt cào cụ thể:

```powershell
python scraper_agent.py --export-only --run-dir data/2026-10-11/run-083015
```

## 10. Xóa metadata không hợp lệ

Xử lý lượt cào mới nhất:

```powershell
python scraper_agent.py --purge-invalid
```

Xử lý một lượt cụ thể:

```powershell
python scraper_agent.py --purge-invalid --run-dir data/2026-10-11/run-083015
```

## 11. Chạy kiểm thử

```powershell
python -m pytest tests -q
```

## Cấu trúc dữ liệu đầu ra

```text
data/
└── YYYY-MM-DD/
    └── run-HHMMSS/
        ├── metadata.json
        ├── raw_html/
        ├── pdf/
        ├── text/
        └── export/
```

Mỗi lệnh cào mới tạo một thư mục `run-HHMMSS` riêng. Nếu chạy trùng giây, tên lượt sẽ được thêm hậu tố như `run-HHMMSS-02`.
