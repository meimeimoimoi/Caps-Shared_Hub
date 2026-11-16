# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Rules live in AGENTS.md (single source shared with Codex/Antigravity); do not copy rules here. Overview, ports and gateway routes: README.md.

@AGENTS.md

## Tests and checks (not covered in AGENTS.md)

Backend (run in `BE/`):

```powershell
dotnet test Caps.sln                                              # unit + architecture tests, nothing needs to be running
dotnet test tests/Caps.Expert.UnitTests                           # one test project
dotnet test Caps.sln --filter "FullyQualifiedName~<ClassOrTestName>" # one class/test by name
dotnet csharpier check .                                          # CI formatting check (format: dotnet csharpier format .)
.\tests\run-auth-integration.ps1                                  # 76 integration tests through the gateway
```

Integration tests need a separate Postgres on `:55432` (DB name ending in `_test`), Redis `:6379`, SeaweedFS `:8333`; the script builds, starts auth/expert/gateway on test ports (55194/55198/55190) and writes logs to `.tmp/auth-tests/`.
`Caps.Architecture.Tests` enforces layering (Domain/Application free of frameworks, no service-to-service references, `common` never references a service, controllers never reference Infrastructure) — a new layered service must be registered there.

Frontend (run in `FE/`): `npm run lint` (oxlint), `npm test` (node --test `tests/*.test.mjs`), `npm run test:e2e` (Playwright). CI runs lint → build → test → e2e.

Python parts (each has its own CI and README): `BE/ai-service` (FastAPI + Qdrant + Ollama, `python -m pytest tests -q`) and `crawler/` (legal-document crawler that exports `knowledge` chunks for `ingestion`, `python -m pytest tests -q`).

## Big picture

- Browser → Gateway (YARP, `:5190`) → services. Each .NET service owns one Postgres schema with its own DB role; there are no cross-service foreign keys, other services' ids are plain columns.
- `auth` is the only JWT signer (RS256); other services validate via `auth`'s `/.well-known/jwks.json`. Session revocation is shared through Redis.
- Service maturity varies: `gateway`, `auth`, `expert` are complete; `billing`, `ingestion`, `workflow` are partial; `rag-query`, `notification`, `read`, `cronjob` are skeletons. Check README.md's service table before assuming an endpoint exists.
- FE pages in `src/pages/<area>/` compose features from `src/features/<name>/`; route guards (`ProtectedRoute`, `StaffRoute`, `ExpertRoute`…) live in `src/app/routes/`. Copy lives in `src/lib/i18n/locales/{vi,en}/*.json` — update both.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
