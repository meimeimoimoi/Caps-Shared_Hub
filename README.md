# Caps-Shared Hub

Monorepo gồm **Backend (.NET 8 Microservices)** và **Frontend (React 19 + Vite + TailwindCSS v4)**.

---

## 1. Yêu cầu môi trường

| Công cụ | Phiên bản |
|---|---|
| .NET SDK | 8.0.421 (pin trong `BE/global.json`) |
| Node.js | 20+ (FE đang chạy Node 24) |
| Docker Desktop | Mới nhất (Postgres/pgvector, Redis, RabbitMQ) |

---

## 2. Cấu trúc tổng thể

```text
Caps-Shared_Hub/
├── BE/
│   ├── Caps.sln                  # Solution: 9 services + common (6 libs)
│   ├── Directory.Build.props     # Props chung: net8.0, Nullable, ImplicitUsings, LangVersion
│   ├── Directory.Packages.props  # Central Package Management — nơi duy nhất pin version
│   ├── gateway/                  # API Gateway (YARP). Single entry point
│   ├── auth/                     # Identity: tài khoản, phiên, JWT (schema `identity`)
│   ├── expert/                   # Hồ sơ đăng ký chuyên gia, minh chứng S3 (schema `expert`)
│   ├── billing/                  # Thanh toán, ví, escrow, payout (schema `billing`, Clean Architecture, chưa có API)
│   ├── ingestion/                # Pipeline nạp tài liệu (schema `knowledge`, chưa có API)
│   ├── rag-query/                # RAG / Vector Search pgvector (skeleton)
│   ├── notification/             # Thông báo bất đồng bộ (skeleton)
│   ├── read/                     # CQRS Read Model (skeleton)
│   ├── workflow/                 # Tài liệu, hội thoại AI, review case (schema `workspace`, `review`, Clean Architecture, chưa có API)
│   ├── cronjob/                  # Tác vụ nền định kỳ (skeleton)
│   ├── common/                   # Thư viện dùng chung:
│   │                             # wrappers, exceptions, abstractions,
│   │                             # security (JWT), messaging (MassTransit),
│   │                             # extensions (AddCommonApi/UseCommonApi)
│   ├── docker/                   # docker-compose.yml + Dockerfile.service
│   └── scripts/                  # start-all.ps1 / start-infra.ps1 / stop-infra.ps1
├── FE/
│   ├── src/
│   │   ├── app/                  # Application shell, providers, routes
│   │   ├── features/             # components / hooks / store / api / types per feature
│   │   ├── components/ui/        # Reusable UI primitives
│   │   ├── lib/                  # API client and generic utilities
│   │   ├── pages/                # Route screens (login, admin, expert)
│   │   ├── hooks/                # Reusable hooks
│   │   ├── assets/               # Logos and shared assets
│   │   ├── styles/               # Global styles and design tokens
│   │   └── main.tsx              # React entry point
│   ├── scripts/check-architecture.mjs
│   ├── .env.example              # Mẫu biến môi trường
│   ├── package.json
│   └── README.md                 # Frontend architecture and conventions
└── README.md                     # File này
```

Chi tiết từng phía: [BE/README.md](BE/README.md) · [FE/README.md](FE/README.md).

Luồng request giai đoạn kiến trúc:

```text
Browser (FE :5173) → Gateway (:5190) → Auth (:5194) → Postgres (schema auth)
                           │                    └── ký JWT RS256, công bố public key ở /.well-known/jwks.json
                           └── /healthz, /readyz mỗi service
```

---

## 3. Khởi chạy nhanh

### 3.1. Hạ tầng (Postgres + pgvector, Redis, RabbitMQ)

```powershell
cd BE
Copy-Item docker\.env.example docker\.env   # lần đầu: đổi các mật khẩu trong docker/.env
.\scripts\start-all.ps1                     # Postgres, Redis, RabbitMQ, Mailpit, SeaweedFS + build
.\scripts\setup-db-users.ps1               # lần đầu: role DB cho từng service + user-secrets
```

`setup-db-users.ps1` dùng `psql` trên máy; nếu chỉ có Postgres trong Docker thì thêm `-Container caps_postgres -Database caps_db`.

| Dịch vụ | Địa chỉ | Tài khoản |
|---|---|---|
| PostgreSQL | `localhost:5432` | admin `postgres` / mật khẩu trong `docker/.env`; mỗi service dùng role `caps_<service>` riêng |
| RabbitMQ UI | `http://localhost:15672` | `guest` / `guest` |
| Redis | `localhost:6379` | — |

### 3.2. Backend

```powershell
cd BE
dotnet build Caps.sln

# Terminal 1 — Auth (http://localhost:5194/healthz)
dotnet run --project auth/Api
dotnet run --project expert/Api

# Terminal 2 — Gateway (http://localhost:5190/healthz)
dotnet run --project gateway/gateway.csproj
```

Smoke test xuyên gateway:

```powershell
curl -X POST http://localhost:5190/api/v1/auth/register `
  -H "Content-Type: application/json" `
  -H "X-Caps-Client: spa" `
  -d '{"email":"a@caps.test","password":"Caps-password-123!","displayName":"Test"}'
```

Hoặc chạy full docker:

```powershell
docker compose -f docker/docker-compose.yml up -d --build
```

### 3.3. Frontend

```powershell
cd FE
cp .env.example .env.development
npm install
npm run dev     # http://localhost:5173
```

Kiểm tra: mở `http://localhost:5173` → chuyển về `/login` → đăng nhập →
vào `/dashboard` (F5 không mất session, 401 tự về `/login`).

| Route | Quyền | Ghi chú |
|---|---|---|
| `/login` | Public | Gọi `POST /api/v1/auth/login` qua gateway |
| `/dashboard` | `ProtectedRoute` | Shell chờ module nghiệp vụ cắm vào |
| `*` | Public | Trang 404 |

---

## 4. Quy ước team (rút gọn)

**Backend**

- Service nhiều nghiệp vụ theo Clean Architecture (mẫu `BE/auth/`: Domain / Application / Infrastructure / Api) và SOLID; chi tiết trong `AGENTS.md`.
- Code dùng chung vào `common/`. Service wiring qua `AddCommonApi` / `UseCommonApi`, không copy `Program.cs`.
- Version package chỉ pin trong `Directory.Packages.props`, `.csproj` không ghi `Version`.
- Service mới: `dotnet sln Caps.sln add <path-to-csproj>` + thêm route YARP nếu đi qua gateway.

**Frontend**

- Tính năng mới: folder theo domain trong `src/features/<ten>/` gồm `components/`, `hooks/`, `store/`, `api/`, `types/` theo kiến trúc nhóm đã chốt.
- UI nguyên tử dùng chung vào `src/components/ui/`. Màn hình đặt tại `src/pages/`; route mới khai báo trong `src/app/routes/` (lazy + `ProtectedRoute` nếu cần auth).
- Gọi API qua `lib/api-client` (`api.get/post`), không dùng `axios` trực tiếp trong component.

---

## 5. Ghi chú giai đoạn kiến trúc

Những điểm cố ý để đơn giản, sẽ thay khi code thật:

- `AuthDbContext.EnsureCreated()` → `dotnet ef migrations`.
- Hash mật khẩu SHA256 demo → BCrypt/Argon2 + refresh token + lockout.
- MassTransit mới có contracts + config, chưa wiring consumer thật.

Frontend dependency rules and verification commands: [FE/README.md](FE/README.md).
