# Backend scripts

Run from `BE/`. Infrastructure, databases, service roles and passwords must be provisioned separately.

| Script | Purpose |
|---|---|
| `run-all-services.ps1` | Builds and starts all ten backend services in the background. `-NoBuild` skips build; `-CoreOnly` starts the five database services and gateway. Logs: `.tmp/services/` at repository root. Check `/readyz` for readiness. |
| `stop-all-services.ps1` | Stops backend processes belonging to this repository; leaves infrastructure and unrelated processes running. |
| `set-connections.ps1` | Updates development connection strings and shared internal keys in each project's user-secrets. Prompts securely; does not create databases, roles or change server passwords. |

```powershell
# Enter the existing connection for each service's own PostgreSQL role.
.\scripts\set-connections.ps1 -Service auth,expert,billing,workflow,ingestion
.\scripts\set-connections.ps1 -Service workflow,rag-query -Name RagQueryInternalKey
.\scripts\set-connections.ps1 -Service auth,expert,gateway -Name Redis
.\scripts\set-connections.ps1 -Service auth,notification -Name RabbitMq
.\scripts\run-all-services.ps1
.\scripts\stop-all-services.ps1
```

Restart services after updating connections. User-secrets are for Development; use environment variables or a secret store in deployment. The connection script never prints connection values.

| Service | Port | Database schemas |
|---|---|---|
| gateway | 5190 | none |
| auth | 5194 | identity |
| expert | 5198 | expert |
| billing | 5220 | billing |
| workflow | 5030 | workspace, review |
| ingestion | 5004 | knowledge |
| notification | 5100 | none |
| cronjob | 5102 | none |
| rag-query | 5104 | none |
| read | 5106 | none |

Layered hosts use `<service>/Api/Api.csproj`; other hosts use `<service>/<service>.csproj`. Namespaces and assemblies retain `Caps.*`.

For optional Docker infrastructure, use Docker Compose directly as described in `docker/README.md`. SQL used exclusively by Docker initialization is stored in `docker/postgres/db/`.

## AI service & internal keys (Development)

When running Flow 1 CV screening or Flow 3/4 AI assistant locally outside Docker:

1. Start Qdrant (`docker compose -f docker/docker-compose.yml up -d qdrant`) and ensure Ollama has `qwen2.5:7b` and `bge-m3:latest` (install Tesseract OCR with `vie` + `eng` language data when screening image/scanned CVs locally outside Docker).
2. Start the Python AI service on `:8000` (`BE/ai-service`: `.\.venv\Scripts\uvicorn.exe app.main:app --host 0.0.0.0 --port 8000`).
3. **Required for Flow 3 AI chat (`workflow` → `rag-query`):** `rag-query` guards `/api/v1/internal/rag/query` with `[RequireInternalKey]` and rejects every call when `InternalApi:Key` is empty (causing `workflow` to return `503 WORKFLOW_RAG_SERVICE_UNAVAILABLE`). Set a matching non-empty development key on both services (never commit real keys):
   ```powershell
   .\scripts\set-connections.ps1 -Service workflow,rag-query -Name RagQueryInternalKey
   ```
   *(Equivalent manual commands: `dotnet user-secrets set "Services:RagQueryInternalKey" "<dev-key>" --project workflow/Api` and `dotnet user-secrets set "InternalApi:Key" "<dev-key>" --project rag-query`.)*
4. If `INTERNAL_API_KEY` is set in `BE/ai-service/.env` (or `InternalApi:Key` on `billing`/`expert`/`ingestion`), set the matching keys via `dotnet user-secrets` in each calling host (`expert/Api`, `workflow/Api`, `rag-query`, `ingestion`, `billing/Api`).