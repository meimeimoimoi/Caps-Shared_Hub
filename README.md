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
│   ├── auth/                     # Identity + JWT + EF Core (schema `auth`)
│   ├── billing/                  # Thanh toán & gói dịch vụ (skeleton)
│   ├── ingestion/                # Pipeline nạp tài liệu (skeleton)
│   ├── rag-query/                # RAG / Vector Search pgvector (skeleton)
│   ├── notification/             # Thông báo bất đồng bộ (skeleton)
│   ├── read/                     # CQRS Read Model (skeleton)
│   ├── workflow/                 # Luồng quy trình nghiệp vụ (skeleton)
│   ├── cronjob/                  # Tác vụ nền định kỳ (skeleton)
│   ├── common/                   # Thư viện dùng chung:
│   │                             # wrappers, exceptions, abstractions,
│   │                             # security (JWT), messaging (MassTransit),
│   │                             # extensions (AddCommonApi/UseCommonApi)
│   ├── docker/                   # docker-compose.yml + Dockerfile.service
│   └── scripts/                  # start-all.ps1 / start-infra.ps1 / stop-infra.ps1
├── FE/
│   ├── src/
│   │   ├── app/                  # App shell: providers (QueryClient) + routes
│   │   ├── features/auth/        # components / hooks / store (zustand) / api / types
│   │   ├── components/ui/        # UI dùng chung kiểu shadcn (button, input, badge)
│   │   ├── lib/                  # api-client (axios + Bearer + 401 auto-logout)
│   │   ├── pages/                # LoginPage / DashboardPage / NotFoundPage
│   │   └── types/                # Types toàn cục
│   ├── .env.example              # Mẫu biến môi trường
│   └── package.json
└── README.md                     # File này
```

Chi tiết từng phía: [BE/README.md](BE/README.md) · [FE/README.md](FE/README.md).

Luồng request giai đoạn kiến trúc:

```text
Browser (FE :5173) → Gateway (:5190) → Auth (:5194) → Postgres (schema auth)
                           │                    └── JWT (HS256, dev)
                           └── /healthz, /readyz mỗi service
```

---

## 3. Khởi chạy nhanh

### 3.1. Hạ tầng (Postgres + pgvector, Redis, RabbitMQ)

```powershell
cd BE
.\scripts\start-all.ps1
```

| Dịch vụ | Địa chỉ | Tài khoản |
|---|---|---|
| PostgreSQL | `localhost:5432` | `postgres` / `postgrespassword` |
| RabbitMQ UI | `http://localhost:15672` | `guest` / `guest` |
| Redis | `localhost:6379` | — |

### 3.2. Backend

```powershell
cd BE
dotnet build Caps.sln

# Terminal 1 — Auth (http://localhost:5194/healthz)
dotnet run --project auth/auth.csproj

# Terminal 2 — Gateway (http://localhost:5190/healthz)
dotnet run --project gateway/gateway.csproj
```

Smoke test xuyên gateway:

```powershell
curl -X POST http://localhost:5190/api/auth/register `
  -H "Content-Type: application/json" `
  -d '{"email":"a@caps.com","password":"Caps123!"}'
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
| `/login` | Public | Gọi `POST /api/auth/login` qua gateway |
| `/dashboard` | `ProtectedRoute` | Shell chờ module nghiệp vụ cắm vào |
| `*` | Public | Trang 404 |

---

## 4. Quy ước team (rút gọn)

**Backend**

- Folder dạng số nhiều: `Controllers/`, `Services/`, `Entities/`, `DTOs/`. Interface prefix `I`, đặt trong `Services/Interface/`.
- Code dùng chung vào `common/`. Service wiring qua `AddCommonApi` / `UseCommonApi`, không copy `Program.cs`.
- Version package chỉ pin trong `Directory.Packages.props`, `.csproj` không ghi `Version`.
- Service mới: `dotnet sln Caps.sln add <path-to-csproj>` + thêm route YARP nếu đi qua gateway.

**Frontend**

- Tính năng mới: folder theo domain trong `src/features/<ten>/` gồm `components/`, `hooks/`, `store/`, `api/`, `types/`.
- UI nguyên tử dùng chung vào `src/components/ui/`. Route mới khai báo trong `src/app/routes/` (lazy + `ProtectedRoute` nếu cần auth).
- Gọi API qua `lib/api-client` (`api.get/post`), không dùng `axios` trực tiếp trong component.

---

## 5. Ghi chú giai đoạn kiến trúc

Những điểm cố ý để đơn giản, sẽ thay khi code thật:

- JWT HS256 + key trong `appsettings.json` → chuyển RS256 + secret manager.
- `AuthDbContext.EnsureCreated()` → `dotnet ef migrations`.
- Hash mật khẩu SHA256 demo → BCrypt/Argon2 + refresh token + lockout.
- MassTransit mới có contracts + config, chưa wiring consumer thật.
