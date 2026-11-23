# Crawler cho người làm ai-service: dữ liệu từ đâu ra và dùng thế nào

> Dành cho người làm RAG / ai-service, **chưa biết gì về cào web hay văn bản pháp luật**.
> Lệnh chạy và tham số: [README.md](README.md), [RUN_COMMANDS.md](RUN_COMMANDS.md).

Đọc nhanh: mục 1 (văn bản pháp luật trông ra sao) → mục 4 (file JSON) → mục 8 (ai-service cần làm gì).

---

## 1. Văn bản pháp luật trong 2 phút

### Có những loại nào?
Giống như cây: cành trên đặt khung, cành dưới hướng dẫn chi tiết.

```
Luật (Quốc hội)                 vd. Luật Thuế TNDN           số hiệu: 14/2008/QH12
  └─ Nghị định (Chính phủ)       hướng dẫn Luật               số hiệu: 218/2013/NĐ-CP
       └─ Thông tư (Bộ)          hướng dẫn chi tiết hơn nữa   số hiệu: 78/2014/TT-BTC
```
- **Số hiệu** là "mã định danh" của văn bản: `số/năm/loại-cơ quan`. Ví dụ `73/2024/TT-BTC` = Thông tư số 73, năm 2024, của Bộ Tài chính.
- Ngoài ra còn có **Quyết định**, **Nghị quyết**, **Thông tư liên tịch**… và **Văn bản hợp nhất (VBHN)** (mục 6).

### Bên trong một văn bản
Văn bản được chia như sách: **Chương → Điều → Khoản → Điểm**. Ví dụ minh hoạ:

```
Điều 5. Các trường hợp miễn lệ phí          ← Điều (có số và tên)
1. Trẻ em dưới 6 tuổi ...                  ← Khoản 1
2. Người cao tuổi ...                      ← Khoản 2
   a) Người từ đủ 80 tuổi ...              ← Điểm a của Khoản 2
   b) ...                                  ← Điểm b
```
Khi trích dẫn luật, người ta nói **"điểm a khoản 2 Điều 5 Thông tư 73/2024/TT-BTC"**. Đây cũng chính là "địa chỉ" mà RAG nên trả về trong citation.

### Hiệu lực: điều quan trọng nhất với RAG
- Mỗi văn bản **có hiệu lực từ một ngày** và có thể **hết hiệu lực** (bị thay thế toàn bộ).
- Văn bản cũng có thể bị **sửa một phần**: một văn bản mới ra, sửa *riêng* "khoản 3 Điều 5". Các khoản khác vẫn giữ nguyên.
- Vì vậy, câu hỏi về **kỳ thuế 2024** và **kỳ thuế 2026** có thể có câu trả lời **khác nhau**, dù cùng một Điều. RAG phải chọn đúng phiên bản theo thời gian. Đó là việc của `TemporalRetriever`.

---

## 2. Crawler làm gì (phiên bản ngắn)

Crawler là một chương trình tự động **vào trang vbpl.vn** (cơ sở dữ liệu pháp luật quốc gia) giống như người thật:

1. **Tìm** theo từ khoá, ví dụ "thuế thu nhập doanh nghiệp".
2. **Mở từng văn bản** tìm được, chép toàn văn và thông tin (số hiệu, ngày ban hành, ngày hiệu lực, còn hiệu lực không).
3. **Xem "gia phả"** của văn bản (tab *Lược đồ* trên vbpl): văn bản nào sửa nó, văn bản nào hướng dẫn nó… rồi lấy thêm **các văn bản liên quan trực tiếp** (chỉ 1 bước, không lan rộng).
4. **Cắt** văn bản thành cây Điều/Khoản/Điểm và ghi ra **file JSON** cho backend.

Vì sao không gọi API cho nhanh? vbpl.vn không có API công khai, và trang chỉ hiện chữ sau khi trình duyệt chạy JavaScript. Vì vậy crawler điều khiển một trình duyệt Chrome không có cửa sổ (Playwright). Người làm ai-service **không cần quan tâm phần này**, chỉ cần dùng file JSON đầu ra.

---

## 3. Dữ liệu nằm ở đâu

Mỗi lần chạy crawler tạo một thư mục mới:
```
crawler/data/2026-10-21/run-221429/
├── metadata.json          ← sổ làm việc của crawler (KHÔNG dùng cho ai-service)
├── text/, pdf/            ← toàn văn thô, file gốc
└── export/                ← ★ THỨ ai-service cần
    ├── manifest.json      ← mục lục: danh sách file + đã cắt được chưa
    ├── luat/…json
    ├── nghi_dinh/…json
    ├── thong_tu/73-2024-tt-btc.json
    └── van_ban_hop_nhat/25-vbhn-btc.json
```
**Mỗi file `export/<loại>/<số-hiệu>.json` = một văn bản.** `manifest.json` chỉ là mục lục, dùng để duyệt qua các file và bỏ qua những file có `parse_status = PARSE_FAILED`.

> Luồng chuẩn: export → **BE ingestion** (.NET) lưu vào DB → admin duyệt / sửa trên trang knowledge-admin → ingestion gọi **ai-service** `/api/v1/kb/chunk-and-embed` với `content_json` **đã duyệt**. ai-service không đọc thẳng file export.

---

## 4. Bên trong một file export

Mỗi file có 3 ngăn. Ví dụ rút gọn từ file thật `van_ban_hop_nhat/25-vbhn-btc.json`:

```jsonc
{
  "schema_version": 2,

  // ① legal_source: "thẻ căn cước" của văn bản
  "legal_source": {
    "document_number": "25/VBHN-BTC",           // số hiệu (khoá duy nhất)
    "doc_type": "Văn bản hợp nhất",
    "issuing_authority": "Bộ Tài chính",
    "title": "Văn bản hợp nhất số 25/VBHN-BTC ...",
    "metadata": {
      "source_doc_id": "6c5d1830-...",           // id trên vbpl
      "matched_keywords": [],                    // rỗng = không khớp từ khoá, được lấy vì là "họ hàng"
      "related_from": {"so_hieu": "73/2024/TT-BTC", "relation": "hop_nhat", "direction": "in"},
      "vbhn_latest": null, "vbhn_outdated": false, "vbhn_missing": []   // xem mục 6
    }
  },

  // ② knowledge_document: nội dung + thời gian
  "knowledge_document": {
    "file_hash": "6ae1de...",                    // đổi = nội dung đổi = phiên bản mới
    "issued_date": "2025-08-05",                 // ngày ban hành
    "effective_from": null,                      // ngày bắt đầu hiệu lực; VBHN luôn null (mục 6), Thông tư 73/2024 là "2024-10-21"
    "effective_to": null,                        // ngày hết hiệu lực (null = còn hiệu lực)
    "content_json": { ... },                     // ★ cây Điều/Khoản: mục 5
    "ingest": {"suggested_status": "APPROVED", "pending_reasons": []},
    "metadata": {"vbhn_effective_from": "2025-07-01", "text_source": "detail_page_dom", ...}
  },

  // ③ chunks: bản XEM TRƯỚC do crawler cắt sẵn, KHÔNG dùng để embed (xem mục 8)
  "chunks": [ ... ]
}
```

`ingest.suggested_status`: `APPROVED` nghĩa là văn bản đủ sạch để tự duyệt. `PENDING` nghĩa là chờ người duyệt; lý do nằm trong `pending_reasons`, ví dụ `PARSE_FAILED` (không cắt được Điều nào), `OCR_TEXT` (chữ đọc từ ảnh, có thể sai chính tả).

---

## 5. `content_json`: phần ai-service cần đọc

Cây **chapters → articles → units**. Mỗi **unit** là một mẩu nhỏ nhất: một Khoản, một Điểm, hoặc đoạn mở đầu của Điều.

```jsonc
"content_json": {
  "parse_status": "PARSED",                 // PARSE_FAILED = chapters rỗng (không tìm được Điều hay mục I, II…)
  "preamble": "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM ... Căn cứ ...",   // phần đầu, trước Điều 1
  "chapters": [{
    "number": "I", "title": "QUY ĐỊNH CHUNG",   // number null = văn bản không chia Chương
    "articles": [{
      "number": "5", "title": "Các trường hợp miễn lệ phí",
      "units": [
        {
          "id": "d5-3",                       // id ổn định trong văn bản: "d<Điều>-<thứ tự>"
          "label": "Khoản 3",                 // nhãn dễ đọc: "Mở đầu" | "Khoản 3" | "Khoản 2 · Điểm a"
          "clause": "3", "point": null,       // Khoản / Điểm (null nếu không có)
          "text": "Đồng bào dân tộc thiểu số ở các xã ...",
          "status": "AUTO",                   // AUTO | WARNING | REVIEWED
          "amendments": [ ... ],              // chỉ khi có: Khoản này đã bị sửa (mục 6)
          "references": [ ... ]               // chỉ khi có: Khoản này nhắc tới Điều/Khoản khác (mục 7)
        }
      ]
    }]
  }],
  "closing": "Nơi nhận: ... (chữ ký)",       // phần cuối, KHÔNG có giá trị pháp lý cho RAG
  "appendices": [{"title": "PHỤ LỤC I ...", "text": "..."}],   // phụ lục (biểu mẫu, bảng)
  "warnings": [],
  "document_notes": [ ... ]                  // chỉ ở VBHN: chú thích ghi ở tên văn bản
}
```

**Lưu ý về unit:**
- Một Khoản có Điểm sẽ thành **nhiều unit**: unit của Khoản chứa **câu dẫn**, ví dụ "2. Các khoản chi **không được trừ** gồm:", và mỗi Điểm là một unit riêng. **Câu dẫn đổi nghĩa của Điểm**, nên khi chunk theo Điểm phải ghép kèm câu dẫn này.
- `status`: `AUTO` = máy tự cắt, chưa ai xem; `WARNING` = có dấu hiệu sai (ví dụ "Khoản 3 đứng sau Khoản 1"), có thêm field `warning`; `REVIEWED` = admin đã xem hoặc sửa.
- Field nào **không có** thì nghĩa là không có gì: unit không có `amendments` = chưa bị sửa.

---

## 6. Văn bản hợp nhất (VBHN): bản "đã cập nhật" của một văn bản

**Vấn đề:** Thông tư A ban hành năm 2024. Năm 2025 có Thông tư B ra *sửa khoản 3 Điều 5 của A*. Đọc A thì thấy bản cũ. Đọc B chỉ thấy câu "Sửa khoản 3 Điều 5 như sau: …". Muốn biết luật **hiện nay**, phải tự ghép A với B.

**VBHN là bản đã ghép sẵn**, do chính cơ quan ban hành làm. Ví dụ thật:
```
Thông tư 73/2024/TT-BTC (gốc, hiệu lực 21/10/2024)
  + Thông tư 71/2025/TT-BTC (sửa một số khoản, hiệu lực 01/7/2025)
  = VBHN 25/VBHN-BTC: nội dung đã cập nhật, kèm chú thích [1]..[4]
```

Ở mỗi chỗ bị sửa, VBHN có một chú thích. Crawler chuyển chú thích đó thành `amendments` trong unit:
```jsonc
"amendments": [{
  "note": 3,
  "type": "sửa đổi, bổ sung",                 // hoặc "bổ sung", "bãi bỏ", "thay thế"... (null nếu không xác định)
  "source_number": "71/2025/TT-BTC",           // văn bản đã sửa khoản này
  "effective_from": "2025-07-01",              // nội dung MỚI của khoản này áp dụng từ ngày này
  "text": "Khoản này được sửa đổi, bổ sung theo quy định tại khoản 5 Điều 1 Thông tư số 71/2025/TT-BTC, có hiệu lực thi hành từ ngày 01 tháng 7 năm 2025."
}]
```

**Những điều ai-service cần biết về VBHN:**

| | Ý nghĩa | Gợi ý dùng |
|---|---|---|
| VBHN **không có ngày hiệu lực** (`effective_from = null`) | VBHN không phải luật mới, chỉ là bản ghép | Dùng `knowledge_document.metadata.vbhn_effective_from`: ngày hiệu lực muộn nhất trong các chú thích, tức là từ ngày này toàn bộ chữ trong VBHN đúng |
| `amendments[].effective_from` | Ngày Khoản đó bắt đầu có nội dung mới | Đưa vào payload của chunk; dùng để giải thích ("đã sửa từ 01/7/2025") |
| Văn bản gốc vẫn còn trong kho | Bản gốc đúng cho **kỳ trước** khi bị sửa | Kỳ thuế **trước** `vbhn_effective_from` thì dùng văn bản gốc; **từ ngày đó trở đi** thì dùng VBHN. Tránh trả về cả hai bản mâu thuẫn |
| Ở văn bản gốc: `vbhn_latest` | VBHN mới nhất của nó (`page_id` = id của VBHN đã cào) | Liên kết văn bản gốc ↔ VBHN |
| Ở văn bản gốc: `vbhn_outdated = true` + `vbhn_missing` | Có văn bản sửa **mới hơn** mà VBHN chưa ghép vào (hoặc chưa có VBHN nào) | Phải xét thêm chunk của các văn bản trong `vbhn_missing` |
| Mỗi lần có sửa đổi mới sẽ ra **VBHN mới** | VBHN cũ vẫn giữ nguyên | Nhiều phiên bản theo thời gian |

---

## 7. Dẫn chiếu: một Khoản "trỏ" tới chỗ khác

Luật hay viết: *"theo quy định tại **khoản 2 Điều 24 của Luật này**"*, hoặc *"tại **khoản 2 Điều 6 Nghị định số 326/2026/NĐ-CP**"*. Nếu RAG chỉ lấy Khoản đang chứa câu đó thì câu trả lời **thiếu nội dung**. Crawler ghi các lời trỏ này thành `references`:

```jsonc
"references": [
  {"doc": "self", "article": "24", "clause": "2", "point": null},            // trong chính văn bản này
  {"doc": "326/2026/NĐ-CP", "article": "6", "clause": "2", "point": null}   // văn bản khác (theo số hiệu)
]
```
- Gợi ý: khi truy xuất trúng một chunk, **lấy kèm 1 bước** các chunk mà nó trỏ tới (cùng `knowledge_document_id` nếu `doc = "self"`, hoặc tìm theo `document_number`). Không đi tiếp từ các chunk lấy kèm.
- Crawler cũng đã **cào sẵn** các văn bản được trỏ tới, nếu tìm thấy trên vbpl (`related_from.relation = "dan_chieu_noi_dung"`).
- Chỉ những lời trỏ **rõ ràng** mới được ghi. Các câu như "khoản 1 Điều 3" mà không nói của văn bản nào thì bị bỏ, vì dễ hiểu sai.

---

## 8. Việc cần làm ở ai-service (hiện trạng và đề xuất)

**Hiện trạng ([BE/ai-service/app/modules/ingestion/chunker.py](../BE/ai-service/app/modules/ingestion/chunker.py)):** `LegalChunker` đọc `content_json["articles"][].clauses[].points[]`, khác với định dạng ở mục 5. Gửi `content_json` của crawler sang thì ra **0 chunk → lỗi 400 `EMPTY_DOCUMENT`**.

**Cách lấy các field cho `IngestDocRequest` từ file export:**

| Field ai-service | Lấy từ |
|---|---|
| `knowledge_document_id`, `legal_source_id` | Id do ingestion tạo khi lưu DB |
| `document_number` | `legal_source.document_number` |
| `title` | `legal_source.title` |
| `effective_from` | `knowledge_document.effective_from`; với VBHN thì `knowledge_document.metadata.vbhn_effective_from` |
| `effective_to` | `knowledge_document.effective_to` |
| `content_json` | `knowledge_document.content_json` (bản **đã duyệt** trong DB) |

**Đề xuất cho chunker mới** (chưa làm):
1. Đọc `chapters → articles → units`. Mỗi chunk tương ứng một Khoản. Khoản quá dài (> ~1500 ký tự) thì tách theo Điểm, nhưng **giữ câu dẫn** của Khoản trong mọi phần.
2. Đầu mỗi chunk có "địa chỉ": `Văn bản <số hiệu> — Điều 5. <tên Điều> — Khoản 3`. Logic sẵn có để chép theo: `build_chunks` trong [crawler/src/exporter.py](src/exporter.py).
3. Payload Qdrant: `article`, `clause`, `point`, `unit id`, `effective_from/to`, cộng `amendments` (nếu có) và `references` (nếu có).
4. Ingest lại cùng văn bản phải **xoá point cũ** theo `knowledge_document_id` (hiện dùng `uuid4` ngẫu nhiên nên sẽ bị trùng).
5. `preamble` và `closing` không cần embed. `appendices` (biểu mẫu, bảng) nên embed riêng.
6. Văn bản `PARSE_FAILED` (`chapters` rỗng) thì không có gì để chunk. Văn bản cũ đánh số kiểu "A-, I., 1-, a-" thay vì "Điều" được tách lại theo phần/mục: article có `kind` = `"Phần"` / `"Mục"`, số là chữ hoặc La Mã (`I`, `A.II`), mọi unit là `WARNING` và `pending_reasons` có `OLD_FORMAT`.

---

## 9. Từ điển nhanh

| Từ | Nghĩa |
|---|---|
| Số hiệu | Mã của văn bản, vd. `73/2024/TT-BTC` |
| Điều / Khoản / Điểm | Article / Clause / Point: 3 cấp bên trong văn bản |
| Hiệu lực | Khoảng thời gian văn bản (hoặc Khoản) được áp dụng |
| Sửa đổi, bổ sung | Văn bản mới thay đổi **một phần** văn bản cũ |
| Thay thế | Văn bản mới thay **toàn bộ** văn bản cũ (văn bản cũ hết hiệu lực) |
| VBHN | Văn bản hợp nhất: bản ghép sẵn văn bản gốc + các sửa đổi |
| Lược đồ | Tab trên vbpl.vn cho biết quan hệ giữa các văn bản |
| vbpl.vn | Cơ sở dữ liệu quốc gia về pháp luật (Bộ Tư pháp), nguồn chính của crawler |
| MOF | vbpq.mof.gov.vn: nguồn phụ của Bộ Tài chính, chỉ có PDF scan nên phải OCR |

---

## 10. Muốn tự tạo dữ liệu mẫu

```powershell
cd crawler
python scraper_agent.py --keyword "lệ phí cấp đổi, cấp lại thẻ căn cước" --doc-types "Thông tư" --top-n 1 --skip-download --no-ocr --export
```
Khoảng 3–5 phút. Kết quả: `crawler/data/<hôm nay>/run-<giờ>/export/`. Lệnh này có đủ các trường hợp: văn bản gốc (TT 73/2024), văn bản sửa đổi (TT 71/2025), VBHN có `amendments` (25/VBHN-BTC), và văn bản được dẫn chiếu.
