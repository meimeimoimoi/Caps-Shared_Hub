# Ingestion service

Builds the legal knowledge base the AI answers from (port **5004**, schema `knowledge`): legal documents are
crawled or uploaded, reviewed by an admin, split into chunks and indexed in the vector store.

## Status

Database model and migrations only; no API or pipeline yet. One project (see AGENTS.md: simple services stay in
one project, split into folders by feature). If the pipeline grows real business rules, move it to the four Clean Architecture projects: Domain, Application, Infrastructure and Api.

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
