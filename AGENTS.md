# AGENTS.md — Caps-Shared Hub

Monorepo: **BE** (.NET 8 microservices) + **FE** (React 19 + Vite + TailwindCSS v4).
Tổng quan, cách chạy, route: xem [README.md](README.md). File này chỉ chứa **quy tắc khi sửa code**.

## Nguyên tắc chung

- Trả lời và comment bằng **tiếng Việt**; tên biến, class, hàm, commit message dùng tiếng Anh. <!-- đổi nếu team quy định khác -->
- Sửa tối thiểu, đúng phạm vi yêu cầu. Không refactor, đổi tên, format lại code không liên quan.
- Trước khi tạo file/pattern mới, tìm code tương tự đã có trong repo và làm theo.
- Không bịa API, package, endpoint. Không chắc thì đọc code hoặc hỏi.
- Không commit secret, token, connection string thật. Chỉ dùng `.env.example` / `appsettings.Development.json`.

## Hỏi lại người dùng trước khi làm

- Thêm/nâng/xóa package (NuGet hoặc npm).
- Sửa `BE/common/` (ảnh hưởng mọi service).
- Đổi schema DB, thêm migration, đổi contract message (MassTransit) hoặc route YARP.
- Đổi cấu trúc thư mục, `Directory.Build.props`, `Directory.Packages.props`, `global.json`.
- Xóa file, hoặc thao tác git phá hủy (`reset --hard`, `push --force`, xóa branch).

## Lệnh thường dùng

Hạ tầng (Postgres+pgvector, Redis, RabbitMQ) — PowerShell, chạy ở `BE/`:

```powershell
.\scripts\start-all.ps1        # hoặc start-infra.ps1 / stop-infra.ps1
```

Backend (chạy ở `BE/`):

```powershell
dotnet build Caps.sln
dotnet run --project auth/auth.csproj          # :5194
dotnet run --project gateway/gateway.csproj    # :5190
```

Frontend (chạy ở `FE/`):

```powershell
npm install
npm run dev        # :5173
```

<!-- TODO team điền: lệnh test / lint / typecheck chính thức, ví dụ:
     dotnet test Caps.sln
     npm run lint ; npm run build -->

**Xong việc nghĩa là:** `dotnet build Caps.sln` pass (nếu sửa BE) và `npm run build` pass (nếu sửa FE). Nếu không chạy được, nói rõ chưa kiểm tra, không báo "đã xong".

## Backend (.NET 8)

- Pin SDK trong `BE/global.json` (8.0.421). Thuộc tính chung (net8.0, Nullable, ImplicitUsings, LangVersion) nằm ở `Directory.Build.props`, không lặp lại trong `.csproj`.
- **Version package chỉ pin trong `Directory.Packages.props`** (Central Package Management). `.csproj` dùng `<PackageReference Include="..." />` **không có `Version`**.
- Tên folder dạng số nhiều: `Controllers/`, `Services/`, `Entities/`, `DTOs/`. Interface có prefix `I`, đặt trong `Services/Interface/`.
- Code dùng chung đặt vào `common/` (wrappers, exceptions, abstractions, security, messaging, extensions). Không copy qua từng service.
- Wiring service qua `AddCommonApi` / `UseCommonApi`. **Không copy `Program.cs`** từ service khác.
- Service mới: `dotnet sln Caps.sln add <path-to-csproj>`, thêm route YARP ở `gateway/` nếu đi qua gateway, và có `/healthz`, `/readyz`.
- Mọi request từ client đi qua Gateway (`:5190`), không gọi thẳng service từ FE.
- Messaging dùng MassTransit; hiện mới có contracts + config, chưa có consumer thật.

## Frontend (React 19 + Vite + Tailwind v4)

- Tính năng mới: `src/features/<ten>/` gồm `components/`, `hooks/`, `store/` (zustand), `api/`, `types/`. Tham khảo `features/auth/`.
- UI nguyên tử dùng chung (kiểu shadcn) vào `src/components/ui/`.
- Route mới khai báo trong `src/app/routes/`: lazy-load, bọc `ProtectedRoute` nếu cần đăng nhập.
- **Gọi API qua `lib/api-client` (`api.get/post`)**. Không import `axios` trực tiếp trong component.
- Server state dùng React Query (QueryClient ở `src/app/`); client state dùng zustand trong `store/` của feature.
- Biến môi trường: thêm vào `.env.example` khi thêm biến mới. Không commit `.env.*` thật.
- Tailwind v4: import bằng `@import "tailwindcss";` trong CSS (không dùng `@tailwind base/components/utilities`). Tùy biến theme bằng `@theme`; không tạo `tailwind.config.js` nếu không được yêu cầu. Với Vite dùng plugin `@tailwindcss/vite`. Ưu tiên utility class, chỉ viết CSS riêng khi utility không làm được.- React 19: không cần `forwardRef` (truyền `ref` như prop thường). Không dùng API đã bị loại bỏ; nếu không chắc, kiểm tra trong code hiện có hoặc hỏi trước.
- Gặp lỗi build lạ sau khi nâng package: đọc changelog/migration guide của đúng version, đừng đoán.
- React 19: truyền `ref` như prop thường (không cần `forwardRef`). Không dùng `ReactDOM.render`, `propTypes`, `defaultProps` trên function component (đã bị gỡ); dùng default parameter của hàm. Không chắc về một API thì hỏi trước.
## Giai đoạn kiến trúc: KHÔNG học theo, KHÔNG nhân bản

Các điểm sau cố ý làm đơn giản và sẽ thay. Không dùng làm mẫu cho code mới:

- JWT HS256 + key trong `appsettings.json` (sẽ chuyển RS256 + secret manager).
- `AuthDbContext.EnsureCreated()` (sẽ chuyển sang `dotnet ef migrations`). Code mới dùng migration.
- Hash mật khẩu SHA256 demo (sẽ chuyển BCrypt/Argon2, kèm refresh token + lockout). Không dùng SHA256 cho mật khẩu ở chỗ khác.

## Git

**Branch**
- Tạo từ `prod` (hoặc nhánh tích hợp team đang dùng), đặt tên: `feature/<ten-ngan>`, `fix/<ten-ngan>`, `chore/<ten-ngan>`, `docs/<ten-ngan>`.
- Tên ngắn, chữ thường, nối bằng dấu gạch ngang, tiếng Anh. Ví dụ: `feature/billing-plans`, `fix/login-401-loop`.
- Không commit trực tiếp lên `main`.

**Commit message** (Conventional Commits, tiếng Anh)
- Dạng: `<type>(<scope>): <mô tả ngắn, thể mệnh lệnh>`, tối đa khoảng 72 ký tự, không có dấu chấm cuối.
- `type`: `feat`, `fix`, `refactor`, `docs`, `chore`, `test`, `build`.
- `scope`: tên service hoặc feature, ví dụ `auth`, `gateway`, `common`, `fe-auth`.
- Ví dụ: `feat(auth): add refresh token endpoint`, `fix(fe-auth): redirect to /login on 401`.
- Một commit là một thay đổi logic. Không gộp sửa lỗi, refactor và tính năng mới vào cùng một commit.

**Pull request**
- PR nhỏ, tập trung một mục đích. Nếu diff lớn, đề xuất tách.
- Mô tả gồm: đã làm gì, vì sao, cách kiểm tra (lệnh đã chạy hoặc các bước thủ công).
- Chạy `dotnet build Caps.sln` (nếu sửa BE) và `npm run build` (nếu sửa FE) trước khi mở PR.
- Không đưa vào PR: file `.env`, secret, file build (`bin/`, `obj/`, `dist/`), `node_modules/`.

**Với agent**
- Chỉ commit khi người dùng yêu cầu. Không tự `push`.
- Không dùng `git push --force`, `git reset --hard`, hay xóa branch khi chưa được xác nhận.
- Không sửa lịch sử commit đã push (rebase, amend) nếu không được yêu cầu.
- Trước khi commit, kiểm tra `git status` và `git diff` để chắc chỉ có file thuộc phạm vi yêu cầu.
