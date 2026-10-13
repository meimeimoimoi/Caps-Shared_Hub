# AGENTS.md — Caps-Shared Hub

Monorepo: **BE** (.NET 8 microservices) + **FE** (React 19 + Vite + TailwindCSS v4).
Tổng quan, cách chạy, route: xem [README.md](README.md). File này chỉ chứa **quy tắc khi sửa code**.

## Nguyên tắc chung

- Trả lời bằng **tiếng Việt**. **Comment trong code bằng tiếng Anh**, không viết comment tiếng Việt; tên biến, class, hàm, commit message cũng dùng tiếng Anh. Nội dung hiển thị cho người dùng (file ngôn ngữ `locales/vi`, nội dung email) vẫn là tiếng Việt.
- Code cũ còn comment tiếng Việt (chủ yếu ở FE): sửa file nào thì dịch comment ở phần mình sửa, không dịch hàng loạt.
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
.\scripts\start-all.ps1        # hoặc start-infra.ps1 / stop-infra.ps1 (cần docker/.env, chép từ docker/.env.example)
.\scripts\setup-db-users.ps1  # một lần mỗi máy: tạo role DB cho từng service + ghi user-secrets
```

Backend (chạy ở `BE/`):

```powershell
dotnet build Caps.sln
dotnet run --project auth/Caps.Auth.Api       # :5194
dotnet run --project expert/Caps.Expert.Api   # :5198
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
- **Service nhiều nghiệp vụ theo Clean Architecture** (mẫu: `auth/`): 4 project `Caps.<Service>.Domain` / `.Application` / `.Infrastructure` / `.Api`, thư mục service giữ chữ thường.
  - `Domain`: entity có hành vi (quy tắc nghiệp vụ nằm trong entity), hằng số, `<Service>Errors`. Không tham chiếu EF Core/ASP.NET.
    Thuộc tính entity dùng `private set`; tạo bằng factory (`User.Register(...)`); thời gian truyền vào từ `TimeProvider`, không gọi `DateTimeOffset.UtcNow` trong entity.
  - `Application`: mỗi use case một file trong `Features/<Nhom>/` gồm `XxxCommand`/`XxxQuery` + `XxxHandler` (implement `ICommandHandler`/`IQueryHandler`); interface (port) trong `Abstractions/`; dịch vụ dùng chung nhỏ trong `Common/`. Chỉ phụ thuộc interface, không dùng `DbContext`, `IOptions`.
  - `Infrastructure`: EF Core + migration, repository, adapter (JWT, hash, email, storage); đăng ký qua `AddXxxInfrastructure`.
  - `Api`: controller chỉ map request → command và nhận đúng handler cần qua `[FromServices]`; lấy người dùng hiện tại bằng `ICurrentUser.RequireUserId()`; request DTO trong `DTOs/Requests/`.
    Action dễ đọc: chỉ dùng `=>` khi thân hàm vừa **một dòng**, còn lại dùng `{ }`; gọi handler rồi gán vào biến (`var session = await ...;`) trước khi `return Ok(...)`, không lồng `await` trong lời gọi hàm khác; mỗi controller có `private Guid UserId => currentUser.RequireUserId();`. Mỗi action có chú thích `///` (summary, remarks, response codes) để hiện trên Swagger.
    `Program.cs` chỉ ghép các hàm cấu hình (`Configuration/*HostSetup.cs`), mỗi hàm một việc; middleware không gọi DB trực tiếp mà qua dịch vụ ở Application.
- Áp dụng **SOLID**: một class một trách nhiệm; thêm use case bằng class mới (handler tự đăng ký qua `AddHandlersFromAssembly`), không sửa class cũ; interface nhỏ theo việc; phụ thuộc vào abstraction.
- Service đơn giản (gateway, notification, read…) giữ 1 project, chia thư mục theo tính năng. Tên folder dạng số nhiều, interface có prefix `I`.
- Lỗi có chủ đích: `throw <Service>Errors.Xxx()` hoặc `CommonErrors.Xxx()` (`AppException` + `ErrorType`), không trả mã HTTP từ Domain/Application.
- Code dùng chung đặt vào `common/` (`Caps.Common.Domain/Application/Security/Api/Messaging/Persistence`, `Caps.Contracts`), chỉ code kỹ thuật, không chứa nghiệp vụ. Không copy qua từng service.
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
- Thu hồi phiên (`AuthBoundaryMiddleware`) đọc thẳng DB của auth (sẽ chuyển sang Redis/event để service khác tự kiểm tra).
- Service `expert` tin token tới khi hết hạn (15 phút), chưa kiểm tra thu hồi phiên (sẽ làm cùng Redis/event).

Đã xong: hồ sơ chuyên gia tách thành service `expert` (schema `expert`); không còn khóa ngoại chéo service, id của service khác (user, review case…) chỉ là cột thường, nên mỗi service migrate độc lập; mỗi service kết nối DB bằng role riêng (`caps_<service>`) chỉ có quyền trên schema của mình, mật khẩu nằm trong user-secrets / `docker/.env`, không nằm trong `appsettings`; DB dùng `dotnet ef migrations`; mật khẩu băm bằng `PasswordHasher` (PBKDF2) + lockout + refresh token xoay vòng.

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
