# Ghi chú merge `origin/feat/ai-service` → `feature/admin-dashboard-api`

Ngày: 2026-11-12. Trạng thái: đã gộp xong conflict và stage, **chưa commit merge**, **chưa sửa lỗi build**.

> **Cập nhật 2026-11-13:** merge `d40489b` đã commit (`8c727f1`). Đã merge tiếp `94e2898` ("fix bug not done yet"): commit này sửa hết các lỗi build và lỗi `BaseAddress` gán hai lần ghi bên dưới. `dotnet build Caps.sln` **pass** (còn 9 warning trong file mới của ai-service). Merge `94e2898` đã stage, chưa commit.
>
> Gộp thêm khi merge `94e2898`: gateway giữ route của cả hai bên (`templates-v1`, `admin-templates-v1`, `knowledge-hubs-v1` + `chat-v1`, `documents-v1`, `knowledge-v1`); workflow `Program.cs` gọi `AddWorkflowInfrastructure(postgres, config)` + `AddWorkflowRealtime()`; DI đăng ký cả `TemplateRepository` lẫn các repository AI mới; bỏ `ConversationRepository` cũ trong `Repositories.cs` (đã chuyển sang `Repositories/`), thêm lại `using Caps.Workflow.Domain.Workspace;` bị ai-service xóa; `KnowledgeDocumentService` giữ bản hiện tại + thêm `Trim('"')`, try/catch khi đọc `system_config`, ném lại `OperationCanceledException`.
>
> Các mục bên dưới là ghi chú của lần merge đầu (lịch sử).

## Cách đã gộp conflict

- `BE/ingestion/Services/Interface/*`: nhánh hiện tại đổi folder thành `Interfaces`, ai-service đổi namespace `ingestion.*` → `Caps.Ingestion.*`. Đã giữ folder `Interfaces` và dùng namespace `Caps.Ingestion.Services.Interfaces`; xóa folder `Interface` cũ.
- `BE/ingestion/Dtos/KnowledgeDocumentDtos.cs` (class rỗng): xóa theo ai-service.
- `BE/ingestion/Services/KnowledgeDocumentService.cs`: lấy bản nhánh hiện tại (TimeProvider, `ChangeTracker.Clear()`, CultureInfo), thêm từ ai-service:
  - số lần retry tối đa đọc từ `system_config` (key `KB_INDEX_MAX_RETRY`, mặc định 3);
  - `Guid.CreateVersion7()` cho `KbChunk.Id`.
  - **Đã bỏ** đoạn `IKnowledgeDocumentService.RetryIndexAsync(...)` ai-service thêm cuối file, vì nó `throw new NotImplementedException()` và sẽ làm API retry-index luôn lỗi.
- `BE/ingestion/Controllers/KnowledgeDocumentController.cs`: lấy bản có code của ai-service (nhánh hiện tại chỉ là class rỗng), sửa `using` sang `Interfaces`.
- `BE/ingestion/Program.cs`, `BE/ingestion/appsettings.json`, `BE/workflow/Infrastructure/DependencyInjection.cs`, `BE/workflow/Infrastructure/Persistence/Repositories.cs`: giữ cả hai bên.
- `BE/SHFT_PostgreSQL.sql`: conflict chỉ là một dòng trống, giữ bản nhánh hiện tại.

## Lỗi build còn tồn tại (có sẵn trong ai-service, chưa sửa)

`dotnet build Caps.sln` → 16 lỗi:

1. **rag-query** — `BE/rag-query/Services/Interface/IChatAiClient.cs` khai báo `namespace rag_query.Services.Interface;` trong khi `Program.cs`, `Controllers/InternalRagController.cs`, `Services/ChatAiClient.cs` dùng `Caps.RagQuery.Services.Interface` (CS0234, CS0246). File này cũng thiếu `using` cho `PythonChatResponse` (nằm ở `Caps.RagQuery.Dtos`).
2. **workflow** — `ConversationRepository` trong `BE/workflow/Infrastructure/Persistence/Repositories.cs` chưa implement `GetByIdAsync`, `GetByUserIdAsync`, `AddAsync` của `IConversationRepository` (CS0535). Ai-service còn có class trùng tên ở `BE/workflow/Infrastructure/Persistence/Repositories/ConversationRepository.cs`, cần chọn giữ một.

## Nghi vấn khác (chưa sửa)

- `BE/workflow/Infrastructure/DependencyInjection.cs`: `AddHttpClient<IRagQueryClient, RagQueryClient>` gán `BaseAddress` và `Timeout` hai lần; dòng sau (`Ai:OllamaUrl`, 3 phút) đè lên URL rag-query (`Services:BaseUrl`).
- `IRagQueryClient` xuất hiện ở hai chỗ: `BE/workflow/Application/Abstractions/IRagQueryClient.cs` và `BE/workflow/Application/AiChat/Interface/IRagQueryClient.cs`.
- Merge kéo theo thay đổi `BE/Directory.Packages.props` từ ai-service (package mới), chưa rà soát.
