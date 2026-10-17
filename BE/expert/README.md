# Expert service

Owns everything about an expert as a service provider: the eligibility application (draft, evidence files,
submit, supplement), the expert profile, and later service offerings, availability and reviews.
It does **not** own accounts or roles (identity service) or case handling (workflow).

## Project layout

- Domain: `ExpertProfile`, `ExpertApplication` (status transitions + audit events), `ExpertEvidence`, `ApplicationRules`, `EligibilityRules` + `EligibilityCheck` (Gate 1), `ExpertErrors`.
- Application: one handler per use case under `Features/Applications` (applicant) and `Features/Reviews` (Gate 1 reviewer); ports under `Abstractions/`.
- Infrastructure: `ExpertDbContext` (schema `expert`) + migrations, repositories, per-user advisory lock, S3 storage.
- Api: `ApplicationsController` (applicant), `ApplicationReviewsController` (reviewer, permission `ExpertReview`), host setup. Swagger shows each endpoint's codes.

## Gate 1 (eligibility review)

A reviewer gives PASS / FAIL / NEED_MORE_INFORMATION for each of EV-01…EV-06 (a note is required unless PASS).
The outcome follows: any FAIL → `NOT_ELIGIBLE` (new application allowed after `ExpertPolicy:ReapplyNotEligibleDays`),
otherwise any NEED_MORE_INFORMATION → the applicant supplements the same application, all PASS → `ELIGIBLE`.
EV-06 cannot pass below `ExpertPolicy:MinYearsExperience` declared years. Reviewers cannot decide their own application.
`ELIGIBLE` is per expert; Gate 2 and final approval (per service) are not built yet.

## Boundaries with other services

- No foreign keys to `identity`: user ids are plain columns.
- The applicant comes from the access token: `sub`, `email`, and `account_status` (ACTIVE = email verified).
  After verifying the email, the client refreshes the session before submitting.
- Name and phone entered in the application are stored here; they do not change the account profile.
- Revoked tokens (sign-out, password change/reset) are rejected at once through the shared Redis revocation store (`ConnectionStrings:Redis`). If Redis is down, tokens are trusted until they expire, except on endpoints marked `[RequireSessionCheck]` (503).

## Run (PowerShell from BE)

~~~powershell
dotnet run --project expert/Api    # http://localhost:5198/healthz, Swagger at /swagger
~~~

The gateway routes `/api/v1/experts/**` and `/api/v1/admin/experts/**` here. Development applies migrations on startup and needs SeaweedFS
(S3 API on :8333) for evidence files.

EF commands: `dotnet ef migrations add <Name> --project expert/Infrastructure --startup-project expert/Api --output-dir Persistence/Migrations`.

Development connection (database and service role must already exist):

```powershell
.\scripts\set-connections.ps1 -Service expert
```
