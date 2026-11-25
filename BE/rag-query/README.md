# RAG query service

Planned AI answering (port **5104**): retrieves the relevant legal chunks from the vector store built by
`ingestion`, asks the language model, and returns the answer with its citations.

## Status

Empty skeleton: it starts, answers `/healthz` and `/readyz`, and validates tokens like every service. No vector
store client, model client or endpoints yet.

## When you start it

- Read the knowledge base through the vector store and the events or API of `ingestion`, never its schema.
- Who pays for a question (free quota or credits) is decided by `workflow` (`AiQuota`, `AiUsage`); this service
  only answers.
- Keep one project and split by feature (`Features/<Name>/`), with the vector store and model clients behind
  interfaces so they can be swapped and faked in tests.
- Keep API keys in user-secrets or the environment, never in `appsettings.json`.

## Internal authentication (`workflow` → `rag-query`)

`POST /api/v1/internal/rag/query` is protected by `[RequireInternalKey]` (`X-Internal-Key` header). Both `rag-query`'s `InternalApi:Key` and `workflow`'s `Services:RagQueryInternalKey` default to `""` in `appsettings.json`, and an empty key rejects every call (producing `503 WORKFLOW_RAG_SERVICE_UNAVAILABLE` in chat).

Before running AI chat locally, set the same random development key in both user-secrets (never commit keys):

~~~powershell
.\scripts\set-connections.ps1 -Service workflow,rag-query -Name RagQueryInternalKey
~~~

Or set them manually from `BE/`:

~~~powershell
dotnet user-secrets set "InternalApi:Key" "<dev-random-key>" --project rag-query
dotnet user-secrets set "Services:RagQueryInternalKey" "<dev-random-key>" --project workflow/Api
~~~

## Run (PowerShell from BE)

~~~powershell
dotnet run --project rag-query   # http://localhost:5104/healthz
~~~
