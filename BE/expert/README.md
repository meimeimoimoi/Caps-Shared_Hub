# Expert service

Owns everything about an expert as a service provider: the eligibility application (draft, evidence files,
submit, supplement), the expert profile, and later service offerings, availability and reviews.
It does **not** own accounts or roles (identity service) or case handling (workflow).

## Project layout

- Caps.Expert.Domain: `ExpertProfile`, `ExpertApplication` (status transitions + audit events), `ExpertEvidence`, `ApplicationRules`, `ExpertErrors`.
- Caps.Expert.Application: one handler per use case under `Features/Applications`; ports under `Abstractions/`.
- Caps.Expert.Infrastructure: `ExpertDbContext` (schema `expert`) + migrations, repositories, per-user advisory lock, S3 storage.
- Caps.Expert.Api: `ApplicationsController`, host setup. Swagger shows each endpoint's codes.

## Boundaries with other services

- No foreign keys to `identity`: user ids are plain columns.
- The applicant comes from the access token: `sub`, `email`, and `account_status` (ACTIVE = email verified).
  After verifying the email, the client refreshes the session before submitting.
- Name and phone entered in the application are stored here; they do not change the account profile.
- Revoked tokens (sign-out, password change/reset) are rejected at once through the shared Redis revocation store (`ConnectionStrings:Redis`). If Redis is down, tokens are trusted until they expire, except on endpoints marked `[RequireSessionCheck]` (503).

## Run (PowerShell from BE)

~~~powershell
.\scripts\setup-db-users.ps1                  # once per machine: role caps_expert + user-secrets
dotnet run --project expert/Caps.Expert.Api    # http://localhost:5198/healthz, Swagger at /swagger
~~~

The gateway routes `/api/v1/experts/**` here. Development applies migrations on startup and needs SeaweedFS
(S3 API on :8333) for evidence files.

EF commands: `dotnet ef migrations add <Name> --project expert/Caps.Expert.Infrastructure --startup-project expert/Caps.Expert.Api --output-dir Persistence/Migrations`.
