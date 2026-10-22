# Ingestion service

Builds the legal knowledge base the AI answers from (port **5004**, schema `knowledge`): legal documents are
crawled or uploaded, reviewed by an admin, split into chunks and indexed in the vector store.

## Status

Knowledge Admin API (crawl jobs, uploads, review queue, reject) and the source catalog are in place; approving,
chunking and indexing are not built yet. One project (see AGENTS.md: simple services stay in one project, split
into folders by feature). If the pipeline grows real business rules, move it to the four Clean Architecture
projects: Domain, Application, Infrastructure and Api.

| Folder | Content |
|---|---|
| `Controllers/` | public API (through the gateway) and `InternalIngestController` for the crawler worker |
| `Features/<group>/` | one use case per file: command/query + handler |
| `DTOs/`, `Constants/`, `Messaging/` | request/response shapes, column values, messages for the worker |
| `Storage/`, `Configuration/`, `Security/` | S3 storage (copied from expert), startup setup, internal key filter |

## API

Through the gateway (`/api/v1/knowledge/**`). `KnowledgeManage` = KNOWLEDGE_ADMIN; the source catalog only needs an
active account. Request/response shapes, error codes and the worker endpoints: [API.md](API.md).

| Method | Route | Who | Purpose |
|---|---|---|---|
| POST | `/crawl-jobs` | KnowledgeManage | start a crawl (`sources`: vbpl/mof, `topN` or `all`); 409 while one runs |
| GET | `/crawl-jobs?page&pageSize` | KnowledgeManage | crawl runs, newest first |
| POST | `/documents/upload` | KnowledgeManage | multipart PDF/DOCX (20 MB) + source metadata → new PENDING version |
| GET | `/documents/pending?page&pageSize` | KnowledgeManage | review queue, oldest first |
| GET | `/documents/{id}/preview` | KnowledgeManage | metadata + `contentJson` + `fileUrl`/`sourceUrl` |
| GET | `/documents/{id}/file` | KnowledgeManage | original of an upload (crawled originals are not stored) |
| POST | `/documents/{id}/reject` | KnowledgeManage | `{reason}`; PENDING → REJECTED, 409 otherwise |
| GET | `/sources?q&docType&page&pageSize` | active account | search by number/title, with amendment links |
| GET | `/sources/{id}/tree` | active account | amendment family tree (from `legal_amendment`) |

`legal_amendment` is written by the crawl import from `legal_source.metadata.related_from` (vbpl "Lược đồ" relations
`sua_doi_mot_phan` → `AMENDS`, `thay_the_toan_bo` → `REPLACES`), when the other source is already imported.

## Crawler worker

`crawler/worker.py` does the slow work. Ingestion publishes `CrawlRequested` and `DocumentParseRequested`
(`Messaging/WorkerMessages.cs`) through MassTransit; the worker reads them from RabbitMQ and calls back the
`/internal/**` endpoints with the `X-Internal-Key` header. The gateway does not route `/internal`.

1. Set the same random key on both sides (never commit it):
   `dotnet user-secrets set "InternalApi:Key" "<key>" --project ingestion` and `INTERNAL_API_KEY=<key>` in
   `crawler/.env` (see `crawler/.env.example`). An empty key rejects every internal call.
2. Start the worker once so it declares its queues; messages published before that are dropped.
3. A job still RUNNING after 12 hours (worker stopped mid-run) is marked FAILED by the next trigger.

Uploaded files go to the `caps-knowledge` bucket (SeaweedFS dev keys in `appsettings.Development.json`).

| Entity | Purpose |
|---|---|
| `LegalSource` | a legal document by its official number (law, decree, circular) |
| `LegalAmendment` | one source amends or replaces another |
| `KnowledgeDocument` | one version of a source, reviewed before indexing |
| `KbChunk` | a searchable piece (article, clause, point) with its vector store id |
| `CrawlJob` | one crawl run, scheduled or started by an admin |

User ids (uploaded by, approved by) are plain columns; users live in auth.

## Run (PowerShell from BE)

~~~powershell
dotnet run --project ingestion         # http://localhost:5004/healthz
~~~

EF commands: `dotnet ef migrations add <Name> --project ingestion --output-dir Migrations`.

Development connection (database and service role must already exist):

```powershell
.\scripts\set-connections.ps1 -Service ingestion
```
