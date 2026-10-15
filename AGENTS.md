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
docker compose -f docker/docker-compose.yml up -d postgres redis rabbitmq mailpit seaweedfs
```

Backend (chạy ở `BE/`):

Chuẩn bị DB/role riêng; cập nhật connection bằng `scripts/set-connections.ps1 -Service auth,expert,billing,workflow,ingestion`. Chạy/dừng bằng `scripts/run-all-services.ps1` và `scripts/stop-all-services.ps1`. Service mới dùng 4 project `Domain/Application/Infrastructure/Api`, namespace và assembly `Caps.<Service>.<Layer>`, đăng ký vào solution và test kiến trúc.

```powershell
dotnet build Caps.sln
dotnet run --project auth/Api       # :5194
dotnet run --project expert/Api   # :5198
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
- **Service nhiều nghiệp vụ theo Clean Architecture** (mẫu: `auth/`): 4 project `Domain` / `Application` / `Infrastructure` / `Api`, thư mục service giữ chữ thường. Namespace và assembly giữ dạng `Caps.<Service>.<Layer>`; khai báo `RootNamespace` và `AssemblyName` trong từng `.csproj`.
  - `Domain`: entity có hành vi (quy tắc nghiệp vụ nằm trong entity), hằng số, `<Service>Errors`. Không tham chiếu EF Core/ASP.NET.
    Thuộc tính entity dùng `private set`; tạo bằng factory (`User.Register(...)`); thời gian truyền vào từ `TimeProvider`, không gọi `DateTimeOffset.UtcNow` trong entity.
  - `Application`: mỗi use case một file trong `Features/<Nhom>/` gồm `XxxCommand`/`XxxQuery` + `XxxHandler` (implement `ICommandHandler`/`IQueryHandler`); interface (port) trong `Abstractions/`; dịch vụ dùng chung nhỏ trong `Common/`. Mỗi interface một file `I<Ten>.cs` (không gộp nhiều interface, không để chung file với class cài đặt; interface của dịch vụ trong `Common/` nằm cạnh class đó). Chỉ phụ thuộc interface, không dùng `DbContext`, `IOptions`.
  - `Infrastructure`: EF Core + migration, repository, adapter (JWT, hash, email, storage); đăng ký qua `AddXxxInfrastructure`.
  - `Api`: controller chỉ map request → command và nhận đúng handler cần qua `[FromServices]`; lấy người dùng hiện tại bằng `ICurrentUser.RequireUserId()`; request DTO trong `DTOs/Requests/`.
    Action dễ đọc: chỉ dùng `=>` khi thân hàm vừa **một dòng**, còn lại dùng `{ }`; gọi handler rồi gán vào biến (`var session = await ...;`) trước khi `return Ok(...)`, không lồng `await` trong lời gọi hàm khác; mỗi controller có `private Guid UserId => currentUser.RequireUserId();`. Mỗi action có chú thích `///` (summary, remarks, response codes) để hiện trên Swagger.
    `Program.cs` chỉ ghép các hàm cấu hình (phần riêng của service đặt trong `Configuration/`, mỗi việc một class, ví dụ `AuthEmailSetup`, `ExpertStorageSetup`); middleware không gọi DB trực tiếp mà qua dịch vụ ở Application. Mỗi middleware một việc.
- Áp dụng **SOLID**: một class một trách nhiệm; thêm use case bằng class mới (handler tự đăng ký qua `AddHandlersFromAssembly`), không sửa class cũ; interface nhỏ theo việc; phụ thuộc vào abstraction.
- Service đơn giản (gateway, notification, read…) giữ 1 project, chia thư mục theo tính năng. Tên folder dạng số nhiều, interface có prefix `I`.
- API nhạy cảm (tiền, duyệt hồ sơ…) gắn `[RequireSessionCheck]`: khi không kiểm tra được phiên đã bị thu hồi (Redis sập) sẽ trả 503 thay vì tin token.
- Lỗi có chủ đích: `throw <Service>Errors.Xxx()` hoặc `CommonErrors.Xxx()` (`AppException` + `ErrorType`), không trả mã HTTP từ Domain/Application.
- Code dùng chung đặt vào `common/` (`Domain/Application/Security/Api/Messaging/Persistence`, `Contracts`). Chỉ đưa vào khi **cả hai** điều đúng: là code kỹ thuật (không nghiệp vụ, không entity) **và** đã cần ở ít nhất 2 service. Chỉ một service dùng thì để trong service đó. Không copy code dùng chung qua từng service.
- Wiring service, không tự viết lại những phần này:
  - `AddCommonApi` / `UseCommonApi`: controller, Swagger (bearer + XML), lỗi chung, `/healthz` (sống) và `/readyz` (DB), JWT, thu hồi phiên, CORS, `TimeProvider`.
  - `config.GetRequiredConnectionString("Postgres")` + `AddServiceDatabase<TContext>(conn, "<Service>", "<schema>")` trong `Add<Service>Infrastructure`: DbContext, bảng lịch sử migration, `IUnitOfWork`, health check DB.
  - `app.MigrateInDevelopment<TContext>()` trước `UseCommonApi()` (tắt bằng `Database:ApplyMigrations=false`).
- Trước khi push: `dotnet csharpier format .` rồi `dotnet build Caps.sln -warnaserror` và `dotnet test Caps.sln` phải sạch; CI chạy đúng các bước này cùng 73 integration test.
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


Đã xong: thu hồi phiên dùng chung qua Redis (đăng xuất, đổi/reset mật khẩu → mọi service từ chối token ngay; Redis sập thì cho qua, trừ API gắn `[RequireSessionCheck]` trả 503); JWT ký RS256, chỉ `auth` giữ private key; service khác xác thực bằng public key tải từ `/.well-known/jwks.json` (dự phòng `Jwt:PublicKeys`), gateway chặn token sai trên route `/me`; hồ sơ chuyên gia tách thành service `expert` (schema `expert`); không còn khóa ngoại chéo service, id của service khác (user, review case…) chỉ là cột thường, nên mỗi service migrate độc lập; mỗi service kết nối DB bằng role riêng (`caps_<service>`) chỉ có quyền trên schema của mình, mật khẩu nằm trong user-secrets / `docker/.env`, không nằm trong `appsettings`; DB dùng `dotnet ef migrations`; mật khẩu băm bằng `PasswordHasher` (PBKDF2) + lockout + refresh token xoay vòng.

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
