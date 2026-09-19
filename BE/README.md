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
Gom nhóm các module dùng chung gọn gàng:
* `abstractions`: Common Interfaces & Contracts.
* `exceptions`: Khai báo exception hệ thống & Domain errors.
* `extensions`: Các tiện ích đăng ký Dependency Injection.
* `messaging`: Event Bus / Message Broker contracts.
* `security`: JWT Helper & Encryption.
* `wrappers`: Chuẩn hóa API ResponseEnvelope & PagedResult.

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
   * *PostgreSQL Connection*: `localhost:5432` (User/Pass: `postgres` / `postgrespassword`)

3. **Biên dịch Dự án**:
   ```powershell
   dotnet build
   ```

4. **Chạy Service mong muốn** (Ví dụ `auth` service):
   ```powershell
   dotnet run --project auth/auth.csproj       # http://localhost:5194/healthz
   dotnet run --project gateway/gateway.csproj # http://localhost:5190/healthz
   ```

   Smoke test xuyên gateway:
   ```powershell
   curl -X POST http://localhost:5190/api/auth/register `
     -H "Content-Type: application/json" `
     -d '{"email":"a@caps.com","password":"Caps123!"}'
   ```

5. **Full docker (auth + gateway + infra)**:
   ```powershell
   docker compose -f docker/docker-compose.yml up -d --build
   ```

6. **Dừng Hạ tầng khi hoàn thành**:
   ```powershell
   .\scripts\stop-infra.ps1
   ```
