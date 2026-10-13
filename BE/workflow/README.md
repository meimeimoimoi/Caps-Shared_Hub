# Workflow service

Owns the user's work (port **5030**): documents built from templates, the AI chat with its free quota, and
expert reviews of a document (schemas `workspace` and `review`).
It does **not** own accounts (auth), expert profiles and availability (expert) or money (billing).

## Status

Database model and migrations only; no API yet. The entities still have public setters and no behavior. The
first use case should turn them into entities with factories and rules (see AGENTS.md and `auth` as the model).

| Area | Entities |
|---|---|
| Documents (`workspace`) | `Template` → `TemplateVersion` (field schema), `Document` → `InputSnapshot` (form data) → `DocumentVersion` (immutable once sent to review) |
| AI chat (`workspace`) | `Conversation` → `ChatMessage` (with citations), `AiQuota` (free questions), `AiUsage` (how each answer was paid) |
| Expert review (`review`) | `ReviewCase` (request → payment → delivery → acceptance), `ReviewTask`, `InfoRequest`, `ReviewAttachment`, `ReviewStatusHistory` |

## Boundaries with other services

User, expert profile, slot and service offering ids are plain columns, not foreign keys: those rows live in
auth and expert. Billing keeps its own copy of review case ids for the same reason. Learn about other services'
data through events or the access token, never by reading their schemas.

## Layout

Clean Architecture, like `auth`: `Caps.Workflow.Domain` (`Workspace/`, `Review/`), `.Application`,
`.Infrastructure` (`WorkflowDbContext` + migrations), `.Api`.

## Run (PowerShell from BE)

~~~powershell
.\scripts\setup-db-users.ps1                      # once per machine: role caps_workflow + user-secrets
dotnet run --project workflow/Caps.Workflow.Api    # http://localhost:5030/healthz
~~~

EF commands: `dotnet ef migrations add <Name> --project workflow/Caps.Workflow.Infrastructure --startup-project workflow/Caps.Workflow.Api --output-dir Persistence/Migrations`.
