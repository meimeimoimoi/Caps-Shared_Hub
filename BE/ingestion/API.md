# Knowledge API (service ingestion)

API của service `ingestion` (cổng 5004, schema `knowledge`). Knowledge Admin dùng nó để crawl, upload và duyệt văn bản
pháp luật trước khi văn bản vào kho tri thức của AI; mọi tài khoản đã kích hoạt tra cứu được danh mục văn bản.
Khi chạy dev, Swagger ở `http://localhost:5004/swagger/ingestion`.

## 1. Quy ước chung

- **Gọi qua gateway** `http://localhost:5190` (`VITE_API_URL` của FE). Mọi path bắt đầu bằng `/api/v1/knowledge`.
  Rate limit `api`: 300 request/phút.
- **Xác thực:** header `Authorization: Bearer <accessToken>`, token lấy từ `POST /api/v1/auth/login`.
- **Quyền:**
  - `crawl-jobs`, `documents`: cần permission `KnowledgeManage` (role `KNOWLEDGE_ADMIN`, nằm trong claim `permission`
    của token).
  - `sources`: chỉ cần tài khoản `ACTIVE` (đã xác minh email).
- **Thành công:** `{ "success": true, "data": …, "message": null }`. Action không trả dữ liệu thì có `data: {}` kèm
  `message`.
- **Lỗi nghiệp vụ:** FE xử lý theo `code`, không theo `message`:
  ```json
  { "message": "The document has already been decided and can no longer change.", "code": "DOCUMENT_NOT_PENDING", "traceId": "00-…", "success": false, "data": null }
  ```
- **Lỗi validate dữ liệu gửi lên** (thiếu field bắt buộc, sai kiểu, quá dài): 400 `application/problem+json`, không có
  `code`, lỗi của từng field nằm trong `errors`:
  ```json
  { "type": "https://tools.ietf.org/html/rfc9110#section-15.5.1", "title": "One or more validation errors occurred.", "status": 400, "errors": { "pageSize": ["The value 'abc' is not valid."] }, "traceId": "00-…" }
  ```
- **401** (thiếu, sai hoặc hết hạn token) và **403** (thiếu quyền, tài khoản chưa `ACTIVE`): body rỗng.
- **Phân trang:** query `page` (từ 1, mặc định 1) và `pageSize` (1–100, mặc định 20); sai thì 400 `INVALID_PAGING`.
  `data` có dạng `{ "items": [ … ], "page": 1, "pageSize": 20, "total": 42 }`.
- **Kiểu dữ liệu:** id là UUID; ngày (`issuedDate`, `effectiveFrom`, `effectiveTo`) dạng `yyyy-MM-dd`; thời điểm
  (`createdAt`, `startedAt`…) theo ISO 8601 có múi giờ. Các field JSON (`detail`, `metadata`, `contentJson`,
  `affectedArticles`) được trả nguyên như lúc lưu, nên nhiều key là snake_case do crawler sinh ra.

## 2. Luồng nghiệp vụ

- **Crawl:** `POST /crawl-jobs` tạo job `RUNNING`. Worker Python (`crawler/worker.py`) cào rồi gửi từng văn bản về; văn
  bản vào hàng chờ `PENDING` với nội dung đã tách Điều. Xong thì job thành `SUCCEEDED` hoặc `FAILED`.
- **Upload:** `POST /documents/upload` tạo văn bản `PENDING` với `hasContent: false`. Worker tách Điều/Khoản (thường vài
  giây), sau đó `hasContent: true`, hoặc có `lastError` nếu không đọc được file.
- **Duyệt:** `GET /documents/pending` → `GET /documents/{id}/preview` (đặt cạnh file gốc: `fileUrl` với văn bản upload,
  `sourceUrl` với văn bản crawl) → `POST /documents/{id}/reject`. API duyệt (`APPROVED`) và index chưa có.

Worker phải đang chạy; nếu không, job đứng ở `RUNNING` và file upload không có nội dung.

| Giá trị | |
|---|---|
| `status` của văn bản | `PENDING`, `REJECTED`; `APPROVED`, `INDEXED`, `INDEX_FAILED` dành cho bước duyệt và index sau này |
| `source` của văn bản | `CRAWL_VBPL` (vbpl.vn), `CRAWL_MOF` (vbpq.mof.gov.vn), `MANUAL_UPLOAD` |
| `status` của crawl job | `RUNNING`, `SUCCEEDED`, `FAILED` |
| `triggerType` của crawl job | `MANUAL` (chưa có crawl theo lịch) |

## 3. Danh sách endpoint

Path tính từ `/api/v1/knowledge`.

| Method | Path | Quyền | Việc |
|---|---|---|---|
| POST | `/crawl-jobs` | KnowledgeManage | Kích hoạt crawl |
| GET | `/crawl-jobs` | KnowledgeManage | Lịch sử crawl |
| POST | `/documents/upload` | KnowledgeManage | Upload PDF/DOCX |
| GET | `/documents/pending` | KnowledgeManage | Hàng chờ duyệt |
| GET | `/documents/{id}/preview` | KnowledgeManage | Xem một văn bản để duyệt |
| GET | `/documents/{id}/file` | KnowledgeManage | Tải file gốc (văn bản upload) |
| POST | `/documents/{id}/reject` | KnowledgeManage | Từ chối văn bản |
| GET | `/sources` | Tài khoản ACTIVE | Tra cứu danh mục văn bản |
| GET | `/sources/{id}/tree` | Tài khoản ACTIVE | Cây sửa đổi |

API nội bộ cho worker: xem mục 7.

## 4. Crawl job

### POST `/crawl-jobs`

Kích hoạt crawl thủ công. Trả **202** ngay, worker chạy nền.

| Field | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `sources` | string[] | Có, 1–2 phần tử | `vbpl`, `mof`; không phân biệt hoa thường, giá trị trùng được gộp |
| `topN` | int | Không | 1–50: số văn bản mới nhất của mỗi loại văn bản; bỏ trống thì crawler lấy 3 |
| `all` | bool | Không | `true` = cào toàn bộ kết quả (chậm, dùng khi khởi tạo kho); khi đó `topN` bị bỏ qua |

```json
{ "sources": ["vbpl"], "topN": 1 }
```

Response `data` (crawl job):

```json
{
  "id": "01a15a77-64ec-7d6f-8705-2eed7318db17",
  "triggerType": "MANUAL",
  "triggeredBy": "01a15a72-b706-79e8-879f-a310173c8f93",
  "status": "RUNNING",
  "docsFound": 0,
  "detail": { "request": { "sources": ["vbpl"], "topN": 1, "all": false } },
  "startedAt": "2026-10-20T17:58:56.4916577+00:00",
  "finishedAt": null
}
```

- Mỗi lúc chỉ chạy một job. Job còn `RUNNING` sau 12 giờ (worker dừng giữa chừng) bị đánh `FAILED` ở lần kích hoạt
  tiếp theo.
- Crawler dùng từ khoá mặc định "thuế thu nhập doanh nghiệp" và 4 loại văn bản: Luật, Nghị định, Thông tư, Quyết định.
  API chưa cho chọn từ khoá hay loại văn bản.
- Nếu không gửi được yêu cầu sang RabbitMQ thì job không được tạo.

Lỗi: 400 `INVALID_CRAWL_SOURCE`; 409 `CRAWL_ALREADY_RUNNING`.

### GET `/crawl-jobs?page=1&pageSize=20`

Lịch sử crawl, mới nhất trước. Item có dạng như response ở trên. Khi job xong, `detail.result` là kết quả worker gửi về:

- `SUCCEEDED`: `{ "runDir": "<thư mục lượt cào trên máy worker>", "documents": [ { "documentNumber", "parseStatus", "documentId", "imported" } ] }`.
  `imported: false` nghĩa là văn bản đã có từ trước, không tạo bản mới.
- `FAILED`: `{ "error": "<lý do>" }`.

```json
{
  "id": "01a15a77-64ec-7d6f-8705-2eed7318db17",
  "triggerType": "MANUAL",
  "triggeredBy": "01a15a72-b706-79e8-879f-a310173c8f93",
  "status": "SUCCEEDED",
  "docsFound": 4,
  "detail": {
    "request": { "sources": ["vbpl"], "topN": 1, "all": false },
    "result": {
      "runDir": "D:\\…\\crawler\\data\\2026-10-21\\run-005856",
      "documents": [
        { "documentNumber": "32/2026/TT-BTC", "parseStatus": "PARSED", "documentId": "01a15a7c-1122-735c-b636-cb23b9363a4a", "imported": true }
      ]
    }
  },
  "startedAt": "2026-10-20T17:58:56.4916577+00:00",
  "finishedAt": "2026-10-20T18:04:03+00:00"
}
```

Lỗi: 400 `INVALID_PAGING`.

## 5. Văn bản (document)

### POST `/documents/upload`

Gửi dạng `multipart/form-data`:

| Field | Bắt buộc | Ghi chú |
|---|---|---|
| `file` | Có | PDF hoặc DOCX, tối đa 20 MB; kiểm tra theo nội dung file, không theo đuôi (file `.doc` cũ không được nhận) |
| `documentNumber` | Có | ≤ 256 ký tự, ví dụ `32/2018/NĐ-CP` |
| `docType` | Có | ≤ 128, ví dụ `Nghị định`; nên dùng đúng tên loại như trên vbpl.vn vì `/sources` lọc theo khớp chính xác |
| `title` | Có | ≤ 2000 |
| `issuingAuthority` | Không | ≤ 512 |
| `issuedDate`, `effectiveFrom`, `effectiveTo` | Không | `yyyy-MM-dd`; `effectiveFrom` không được sau `effectiveTo` |

- Số hiệu chưa có: tạo nguồn văn bản mới, `versionNo` = 1.
- Số hiệu đã có (khớp chính xác): thêm version mới (`versionNo` lớn nhất + 1) và **giữ nguyên** `docType`, `title`,
  `issuingAuthority` đã lưu của nguồn; giá trị gửi lên cho 3 field này bị bỏ qua. Các ngày thì lưu theo từng version.
- File giống hệt (cùng SHA-256) một file đã upload thì bị từ chối.

Response **200**, `data` là bản tóm tắt của văn bản (các field giải thích ở `GET /documents/pending`), lúc này
`hasContent: false`:

```json
{
  "id": "01a15a75-8ab0-7d16-a5cd-7fcc1d4466dd",
  "legalSourceId": "01a15a74-0de0-701a-8b29-15f7a55eff09",
  "documentNumber": "32/2018/NĐ-CP",
  "docType": "Nghị định",
  "title": "Nghị định số 32/2018/NĐ-CP …",
  "versionNo": 2,
  "source": "MANUAL_UPLOAD",
  "status": "PENDING",
  "issuedDate": "2018-03-08",
  "effectiveFrom": "2018-05-01",
  "hasContent": false,
  "lastError": null,
  "createdAt": "2026-10-20T17:56:55.06805+00:00"
}
```

Lỗi: 400 `FILE_REQUIRED`, `FILE_TOO_LARGE`, `FILE_INVALID_TYPE`, `INVALID_EFFECTIVE_PERIOD`; 409 `DOCUMENT_DUPLICATE`.

### GET `/documents/pending?page=1&pageSize=20`

Văn bản `PENDING`, cũ nhất trước để duyệt theo thứ tự đến. Mỗi item:

| Field | Ý nghĩa |
|---|---|
| `id` | Id của version văn bản, dùng cho preview, file, reject |
| `legalSourceId` | Id của nguồn văn bản, dùng cho `/sources/{id}/tree` |
| `documentNumber`, `docType`, `title` | Thông tin của nguồn văn bản |
| `versionNo` | Thứ tự version trong nguồn |
| `source` | `CRAWL_VBPL`, `CRAWL_MOF` hoặc `MANUAL_UPLOAD` |
| `status` | `PENDING` |
| `issuedDate`, `effectiveFrom` | Có thể null |
| `hasContent` | Đã có nội dung tách Điều (`contentJson`) chưa |
| `lastError` | Lý do worker không tách được file upload; null nếu không lỗi |
| `createdAt` | Lúc vào hàng chờ |

`hasContent: false` và `lastError: null` nghĩa là worker chưa xử lý xong. Có `lastError` thì văn bản vẫn `PENDING`, admin
có thể từ chối.

Lỗi: 400 `INVALID_PAGING`.

### GET `/documents/{id}/preview`

Toàn bộ thông tin của một version, dùng cho màn hình duyệt 2 cột (nội dung tách Điều bên cạnh file gốc). Xem được ở mọi
trạng thái, không chỉ `PENDING`.

Response gồm các field của bản tóm tắt (trừ `hasContent`) và thêm:

| Field | Ý nghĩa |
|---|---|
| `issuingAuthority`, `effectiveTo` | |
| `crawlJobId` | Job đã tìm ra văn bản (văn bản crawl) |
| `uploadedBy` | Người upload (văn bản upload) |
| `rejectionReason` | Lý do từ chối |
| `approvedBy`, `approvedAt` | Người và thời điểm quyết định, kể cả khi từ chối |
| `metadata` | Văn bản upload: `{ fileName, contentType, sizeBytes }`. Văn bản crawl: thông tin từ crawler như `tinh_trang_hieu_luc`; `ingest.suggested_status` (`APPROVED`/`PENDING`) và `ingest.pending_reasons` là gợi ý cho người duyệt |
| `contentJson` | Nội dung đã tách (cấu trúc bên dưới); null khi file upload chưa tách xong |
| `fileUrl` | Chỉ có với văn bản upload: `/api/v1/knowledge/documents/{id}/file` |
| `sourceUrl` | Chỉ có với văn bản crawl: trang văn bản trên site nguồn, ví dụ `https://vbpl.vn/van-ban/chi-tiet/173118` |

`fileUrl` cần token nên không gắn thẳng vào `<iframe>` hay `<a href>`: tải bằng `api.get(fileUrl, { responseType: 'blob' })`
rồi `URL.createObjectURL`, giống `getEvidenceFile` trong `FE/src/features/expert-vetting/api/adminApi.ts`.

Cấu trúc `contentJson`:

```jsonc
{
  "parse_status": "PARSED",               // PARSE_FAILED khi không tìm thấy Điều nào
  "preamble": "BỘ GIAO THÔNG VẬN TẢI …",   // phần đầu văn bản, trước Chương/Điều đầu tiên
  "chapters": [
    {
      "number": "I",                      // null: các Điều không thuộc Chương nào
      "title": "QUY ĐỊNH CHUNG",
      "part": null,                       // Phần (nếu có)
      "articles": [
        {
          "number": "1",
          "title": "Phạm vi điều chỉnh",
          "section": null,                // Mục (nếu có)
          "units": [
            { "id": "d1-0", "label": "Mở đầu", "clause": null, "point": null, "text": "…", "status": "AUTO" },
            { "id": "d1-1", "label": "Khoản 1", "clause": "1", "point": null, "text": "…", "status": "AUTO" },
            { "id": "d1-2", "label": "Khoản 1 · Điểm a", "clause": "1", "point": "a", "text": "…", "status": "WARNING", "warning": "…" }
          ]
        }
      ]
    }
  ],
  "closing": "Nơi nhận: …",
  "appendices": [{ "title": "Phụ lục I", "text": "…" }],
  "warnings": ["Số Điều không liên tiếp: Điều 2 -> Điều 1"]
}
```

`units` là từng đoạn mở đầu, Khoản hoặc Điểm của một Điều. Unit có `status: "WARNING"` (kèm `warning`) là chỗ đánh số
bất thường cần người duyệt xem lại; `warnings` ở cuối là cảnh báo cho cả văn bản.

Lỗi: 404 `DOCUMENT_NOT_FOUND`.

### GET `/documents/{id}/file`

Trả file gốc của văn bản upload, kèm header `Content-Type` (`application/pdf` hoặc DOCX),
`Content-Disposition: attachment; filename=…`, `X-Content-Type-Options: nosniff`, `Cache-Control: private, no-store`.

Lỗi: 404 `DOCUMENT_NOT_FOUND`; 404 `DOCUMENT_FILE_NOT_STORED` với văn bản crawl (không lưu file gốc, dùng `sourceUrl`).

### POST `/documents/{id}/reject`

```json
{ "reason": "Không có toàn văn, chờ bản PDF có text." }
```

`reason` bắt buộc, không được rỗng hay chỉ có khoảng trắng, tối đa 1000 ký tự; khoảng trắng ở 2 đầu bị cắt. Văn bản
chuyển từ `PENDING` sang `REJECTED`, lưu `rejectionReason`, `approvedBy`, `approvedAt` và rời hàng chờ. Hai admin từ chối
cùng lúc thì chỉ một người thành công.

Response **200**: `{ "success": true, "data": {}, "message": "Document rejected." }`

Lỗi: 400 khi `reason` không hợp lệ (lỗi nằm ở `errors.Reason`); 404 `DOCUMENT_NOT_FOUND`; 409 `DOCUMENT_NOT_PENDING`
(văn bản đã được quyết định); 503 `SESSION_CHECK_UNAVAILABLE` (không kiểm tra được phiên đăng nhập, thử lại sau).

## 6. Danh mục văn bản (source)

### GET `/sources?q=&docType=&page=1&pageSize=20`

| Query | Ghi chú |
|---|---|
| `q` | ≤ 200 ký tự; tìm một phần số hiệu hoặc tiêu đề, không phân biệt hoa thường; `%` và `_` được hiểu là ký tự thường |
| `docType` | ≤ 128; khớp chính xác, ví dụ `Thông tư` |

Kết quả sắp theo `documentNumber` tăng dần. Mỗi item:

```json
{
  "id": "01a15a74-08e4-707b-a7f0-9d853aaa8284",
  "documentNumber": "47/2024/TT-BGTVT",
  "docType": "Thông tư",
  "issuingAuthority": "Bộ Giao thông vận tải",
  "title": "Thông tư số 47/2024/TT-BGTVT Quy định trình tự, thủ tục kiểm định …",
  "latestEffectiveFrom": null,
  "latestEffectiveTo": null,
  "amends": [],
  "amendedBy": []
}
```

| Field | Ý nghĩa |
|---|---|
| `latestEffectiveFrom`, `latestEffectiveTo` | Hiệu lực của version `APPROVED` hoặc `INDEXED` mới nhất; null khi chưa có version nào được duyệt |
| `amends` | Các văn bản mà văn bản này sửa đổi: `{ id, documentNumber, relationType }` |
| `amendedBy` | Các văn bản sửa đổi văn bản này, cùng dạng |

Danh mục gồm mọi nguồn đã được crawl hoặc upload, kể cả nguồn chưa có version nào được duyệt.

Lỗi: 400 `INVALID_PAGING`, hoặc khi `q`/`docType` quá dài.

### GET `/sources/{id}/tree`

Cây sửa đổi của một văn bản. Gốc là văn bản ban đầu, tìm bằng cách đi ngược theo quan hệ "sửa đổi" tới văn bản không
sửa văn bản nào khác (một văn bản sửa nhiều văn bản thì đi theo quan hệ được ghi sớm nhất). `children` của mỗi node là
các văn bản sửa đổi node đó. `relationType` (mặc định `AMENDS`) và `affectedArticles` (JSON tự do) mô tả quan hệ với node
cha; ở gốc cả hai là null. Cây sâu tối đa 10 tầng; quan hệ vòng bị cắt, mỗi văn bản chỉ xuất hiện một lần.

```json
{
  "id": "…",
  "documentNumber": "78/2014/TT-BTC",
  "title": "…",
  "docType": "Thông tư",
  "relationType": null,
  "affectedArticles": null,
  "children": [
    {
      "id": "…",
      "documentNumber": "96/2015/TT-BTC",
      "title": "…",
      "docType": "Thông tư",
      "relationType": "AMENDS",
      "affectedArticles": null,
      "children": []
    }
  ]
}
```

Hiện chưa có luồng nào ghi bảng `legal_amendment` (file export của crawler không có quan hệ sửa đổi), nên cây luôn chỉ có
một node và `amends`/`amendedBy` ở `/sources` luôn rỗng.

Lỗi: 404 `SOURCE_NOT_FOUND`.

## 7. API nội bộ cho worker

Worker (`crawler/worker.py`) gọi thẳng ingestion ở `http://localhost:5004`, **không qua gateway** (gateway không route
`/internal`). Mọi request cần header `X-Internal-Key` bằng `InternalApi:Key` của ingestion; thiếu key, sai key hoặc
ingestion chưa cấu hình key thì trả 401 `INTERNAL_KEY_INVALID`. Cách đặt key: [README.md](README.md#crawler-worker).

| Method | Path | Body | Response `data` |
|---|---|---|---|
| POST | `/internal/crawl-jobs/{id}/documents` | Một file export của crawler | `{ "documentId", "imported" }` |
| POST | `/internal/crawl-jobs/{id}/complete` | `{ "status", "docsFound", "detail" }` | Crawl job |
| GET | `/internal/documents/{id}/file` | | File gốc, như `/documents/{id}/file` |
| POST | `/internal/documents/{id}/content` | `{ "contentJson" }` hoặc `{ "error" }` | `{}`, message `Content saved.` |

**Import văn bản** (`/documents`): body là nguyên một file `export/<loai>/<so-hieu>.json` (schema_version 2), key
snake_case:

| Field | Ghi chú |
|---|---|
| `schema_version` | Phải là 2 |
| `legal_source.document_number`, `doc_type`, `title` | Bắt buộc; `document_number` ≤ 256, `doc_type` ≤ 128 |
| `legal_source.issuing_authority` | ≤ 512 |
| `legal_source.metadata.detail_url` | Thành `sourceUrl` của văn bản |
| `knowledge_document.source` | `CRAWL_VBPL` hoặc `CRAWL_MOF` |
| `knowledge_document.file_hash` | SHA-256 dạng hex chữ thường; hash đã có thì không tạo mới, trả `imported: false` kèm `documentId` cũ |
| `knowledge_document.content_json` | Bắt buộc, phải là object |
| `knowledge_document.issued_date`, `effective_from`, `effective_to` | `yyyy-MM-dd` |
| `knowledge_document.ingest`, `metadata` | Lưu vào `metadata` của văn bản |
| `chunks` | Bị bỏ qua (dành cho bước index) |

Văn bản được tạo ở trạng thái `PENDING`, là version mới của nguồn cùng số hiệu (nguồn được tạo nếu chưa có). Job phải
đang `RUNNING`.
Lỗi: 400 `INVALID_DOCUMENT_SOURCE`, `INVALID_CONTENT_JSON`; 404 `CRAWL_JOB_NOT_FOUND`; 409 `CRAWL_JOB_NOT_RUNNING`.

**Kết thúc job** (`/complete`): `status` là `SUCCEEDED` hoặc `FAILED` (không phân biệt hoa thường), `docsFound` ≥ 0,
`detail` là JSON bất kỳ và được lưu vào `detail.result`.
Lỗi: 400 `INVALID_CRAWL_JOB_STATUS`; 404 `CRAWL_JOB_NOT_FOUND`; 409 `CRAWL_JOB_NOT_RUNNING`.

**Nội dung file upload** (`/content`): gửi đúng một trong hai field: `contentJson` (object, cấu trúc như ở mục 5) hoặc
`error` (≤ 2000 ký tự). Gửi `contentJson` thì `lastError` cũ bị xoá. Chỉ văn bản `PENDING` mới được ghi.
Lỗi: 400 `INVALID_PARSE_RESULT`, `INVALID_CONTENT_JSON`; 404 `DOCUMENT_NOT_FOUND`; 409 `DOCUMENT_NOT_PENDING`.

### Message RabbitMQ

Ingestion publish qua MassTransit; worker đọc payload ở field `message` của envelope.

| Exchange (fanout, durable) | Queue của worker | Payload |
|---|---|---|
| `Caps.Ingestion.Messaging:CrawlRequested` | `crawler-worker-crawl` | `{ "crawlJobId", "sources", "topN", "all" }` |
| `Caps.Ingestion.Messaging:DocumentParseRequested` | `crawler-worker-parse` | `{ "documentId" }` |

Worker tạo queue khi khởi động. Message được publish trước khi queue tồn tại sẽ mất, nên phải chạy worker ít nhất một lần
trước khi kích hoạt crawl hoặc upload.

## 8. Mã lỗi

| `code` | HTTP | Khi nào |
|---|---|---|
| `INVALID_PAGING` | 400 | `page` < 1 hoặc `pageSize` ngoài khoảng 1–100 |
| `INVALID_CRAWL_SOURCE` | 400 | `sources` có giá trị khác `vbpl`, `mof` |
| `CRAWL_ALREADY_RUNNING` | 409 | Đang có crawl job `RUNNING` |
| `FILE_REQUIRED` | 400 | Thiếu file hoặc file rỗng |
| `FILE_TOO_LARGE` | 400 | File lớn hơn 20 MB |
| `FILE_INVALID_TYPE` | 400 | File không phải PDF hoặc DOCX |
| `INVALID_EFFECTIVE_PERIOD` | 400 | `effectiveFrom` sau `effectiveTo` |
| `DOCUMENT_DUPLICATE` | 409 | File đã được upload trước đó |
| `DOCUMENT_NOT_FOUND` | 404 | Không có văn bản với id này |
| `DOCUMENT_FILE_NOT_STORED` | 404 | Văn bản crawl, không có file gốc |
| `DOCUMENT_NOT_PENDING` | 409 | Văn bản đã được quyết định |
| `SOURCE_NOT_FOUND` | 404 | Không có nguồn văn bản với id này |
| `SESSION_CHECK_UNAVAILABLE` | 503 | Không kiểm tra được phiên đăng nhập (reject) |

Chỉ có ở API nội bộ: `INTERNAL_KEY_INVALID` (401), `CRAWL_JOB_NOT_FOUND` (404), `CRAWL_JOB_NOT_RUNNING` (409),
`INVALID_CRAWL_JOB_STATUS`, `INVALID_DOCUMENT_SOURCE`, `INVALID_CONTENT_JSON`, `INVALID_PARSE_RESULT` (400).

## 9. Chưa có

- API duyệt văn bản (`APPROVED`), tách chunk và index vào vector store.
- Sửa metadata của nguồn văn bản, xoá văn bản.
- Ghi quan hệ sửa đổi (`legal_amendment`).
- Chọn từ khoá hoặc loại văn bản khi crawl; crawl theo lịch (`SCHEDULED`).
