# Caps-Shared Hub - Backend Services

Hệ thống Backend xây dựng theo kiến trúc **Microservices / Modular Architecture** trên nền **.NET 8 (C#)**, tích hợp **RAG (AI/Vector Search)** và cơ chế lưu trữ **PostgreSQL Schema-per-Service**.

---

## Kiến trúc Hệ thống (Architecture Overview)

### 1. Các Microservices chính
* **`gateway`**: API Gateway (Single Point of Entry) tiếp nhận và điều hướng request.
* **`auth`**: Dịch vụ xác thực, phân quyền, quản lý Identity & Token (JWT).
* **`read`**: Dịch vụ chuyên đọc dữ liệu (CQRS Read Model) tối ưu cho hiệu năng cao.
* **`workflow`**: Dịch vụ xử lý quy trình nghiệp vụ & luồng làm việc.
* **`ingestion`**: Pipeline nạp và xử lý tài liệu/dữ liệu đầu vào.
* **`rag-query`**: Dịch vụ truy vấn AI, RAG (Retrieval-Augmented Generation) & Vector Search.
* **`notification`**: Dịch vụ gửi thông báo bất đồng bộ (Email, SMS, Push Notification).
* **`billing`**: Dịch vụ thanh toán và quản lý gói dịch vụ.
* **`cronjob`**: Dịch vụ chạy các tác vụ định kỳ ngầm (Background Worker).

### 2. Thư viện dùng chung (`common`)
Chỉ chứa code kỹ thuật, tách theo tầng: `Domain` · `Application` · `Security` · `Api` · `Persistence` · `Messaging`, cùng `Contracts` (sự kiện giữa các service). Chi tiết và quy tắc thêm code: [common/README.md](common/README.md).

### 3. Tài liệu từng thư mục
Mỗi thư mục có README riêng: service lo việc gì, không lo việc gì, cấu trúc, cách chạy, cấu hình.

| Thư mục | README |
|---|---|
| Service có nghiệp vụ | [auth](auth/README.md) · [expert](expert/README.md) · [billing](billing/README.md) · [workflow](workflow/README.md) · [ingestion](ingestion/README.md) |
| Service hạ tầng | [gateway](gateway/README.md) · [notification](notification/README.md) |
| Service chưa triển khai | [read](read/README.md) · [rag-query](rag-query/README.md) · [cronjob](cronjob/README.md) |
| Dùng chung, hạ tầng, công cụ | [common](common/README.md) · [docker](docker/README.md) · [scripts](scripts/README.md) (cổng chuẩn của mọi service) · [tests](tests/README.md) |

---

## Cơ sở dữ liệu & Hạ tầng (Database & Infra)

* **PostgreSQL** (Dùng 1 Database duy nhất với ranh giới **Schema-per-Service**):
  * Kích hoạt extension `pgvector` phục vụ tìm kiếm vector cho `rag-query`.
* **Redis**: Caching Layer nâng cao tốc độ phản hồi.
* **RabbitMQ**: Message Broker xử lý sự kiện bất đồng bộ giữa các service.

---

## Hướng dẫn Khởi chạy Nhanh (Quick Start)

### Yêu cầu môi trường
* **.NET 8.0 SDK**
* **Docker Desktop**

### Các bước thực hiện

> Kiến trúc đã hoàn thiện P0-P2: Central Package Management, `common/` cross-cutting,
> `auth` JWT+EF thật, `gateway` YARP, `docker-compose` full-stack.

1. **Khởi động nhanh (khuyên dùng)**:
   ```powershell
   .\scripts\start-all.ps1
   ```

2. **Hoặc thủ công — Hạ tầng (Postgres + pgvector, Redis, RabbitMQ)**:
   Mở Terminal tại thư mục `BE/` và chạy:
   ```powershell
   .\scripts\start-infra.ps1
   ```
   * *RabbitMQ Management Dashboard*: [http://localhost:15672](http://localhost:15672) (User/Pass: `guest` / `guest`)
   * *PostgreSQL Connection*: `localhost:5432` (admin `postgres`, mật khẩu đặt trong `docker/.env`, chép từ `docker/.env.example`)
   * Lần đầu chạy `.\scripts\setup-db-users.ps1` để tạo role riêng cho từng service (chỉ có quyền trên schema của mình) và ghi chuỗi kết nối vào user-secrets.

3. **Biên dịch Dự án**:
   ```powershell
   dotnet build
   ```

4. **Chạy Service mong muốn** (Ví dụ `auth` service):
   ```powershell
   dotnet run --project auth/Api    # http://localhost:5194/healthz
   dotnet run --project expert/Api # http://localhost:5198/healthz (xem expert/README.md)
   dotnet run --project gateway/gateway.csproj # http://localhost:5190/healthz
   ```

   Smoke test xuyên gateway:
   ```powershell
   curl -X POST http://localhost:5190/api/v1/auth/register `
     -H "Content-Type: application/json" `
     -H "X-Caps-Client: spa" `
     -d '{"email":"a@caps.com","password":"Caps123!DemoPassword"}'
   ```

5. **Full docker (auth + gateway + infra)**:
   ```powershell
   docker compose -f docker/docker-compose.yml up -d --build
   ```

6. **Dừng Hạ tầng khi hoàn thành**:
   ```powershell
   .\scripts\stop-infra.ps1
   ```

## Auth implementation

Xem [auth/README.md](auth/README.md) cho contract 12 API v1, migrations, refresh cookie, email notification và bộ kiểm thử qua YARP. Chuỗi kết nối Postgres của auth đặt bằng User Secrets (mỗi máy chạy 1 lần, xem auth/README.md); chạy notification để nhận email qua RabbitMQ.
