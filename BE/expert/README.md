# Expert service

Owns everything about an expert as a service provider: the eligibility application (draft, evidence files,
submit, supplement), the expert profile, and later service offerings, availability and reviews.
It does **not** own accounts or roles (identity service) or case handling (workflow).

## Project layout

- Domain: `ExpertProfile`, `ExpertApplication` (status transitions + audit events), `ExpertEvidence`, `ApplicationRules`, `EligibilityRules` + `EligibilityCheck` (Gate 1), `ExpertServiceQualification` + `CompetencyRules` + `CompetencyAssessment` (Gate 2), `ExpertErrors`.
- Application: one handler per use case under `Features/Applications` and `Features/Qualifications` (expert) and `Features/Reviews` (Gate 1 and Gate 2 reviewer); ports under `Abstractions/`.
- Infrastructure: `ExpertDbContext` (schema `expert`) + migrations, repositories, per-user advisory lock, S3 storage.
- Api: `ApplicationsController` + `QualificationsController` (expert), `ApplicationReviewsController` + `QualificationReviewsController` (reviewer, permission `ExpertReview`), host setup. Swagger shows each endpoint's codes.

## Expert Portal context

`GET /api/v1/experts/me/context` tells the portal what the signed-in account may open. Capabilities:
`application.view` (always), `services.manage` + `profile.public` (a service approved), `cases.work` + `income.view`
(a service can take bookings); the EXPERT role's `ServiceManage` / `CaseWork` permissions grant them too.
`services` has one readiness entry per ACTIVE row of `expert.service_catalog` (seeded with `HUMAN_VERIFICATION`);
adding a service is a new catalog row, not a code change.

## Gate 1 (eligibility review)

Applicants can attach a public CV or supporting link through the gateway:
`POST /api/v1/experts/me/application/evidence/link` with JSON
`{"code":"CV","sourceUrl":"https://example.com/cv.pdf"}`.
Codes and application status rules are the same as file uploads; links count toward the shared
20-evidence limit (3 before email verification). Repeating the same normalized URL in the same group
returns `EVIDENCE_DUPLICATE`. An invalid URL returns `EVIDENCE_INVALID_URL`.
Only absolute HTTP(S) URLs without credentials are accepted, with a maximum length of 2048 characters;
local host names and private IP literals are rejected. This is URL validation only: the service does
not resolve DNS, check sharing permissions, download content or run extraction.
Application and qualification evidence responses expose `sourceUrl` (null for uploaded files),
including reviewer responses. Clients should open that URL for links instead of the file endpoint;
file endpoints return 404 for link evidence. A CV link satisfies the CV submission requirement.
The existing evidence DELETE endpoint removes links under the same rules as files.

A reviewer gives PASS / FAIL / NEED_MORE_INFORMATION for each of EV-01…EV-06 (a note is required unless PASS).
The outcome follows: any FAIL → `NOT_ELIGIBLE` (new application allowed after `ExpertPolicy:ReapplyNotEligibleDays`),
otherwise any NEED_MORE_INFORMATION → the applicant supplements the same application, all PASS → `ELIGIBLE`.
EV-06 cannot pass below `ExpertPolicy:MinYearsExperience` declared years. Reviewers cannot decide their own application.
`NOT_APPLICABLE` is allowed only on `ExpertPolicy:NotApplicableCriteria` (EV-03), needs a note and counts as PASS.
EV-04/EV-05 show the statements mapped by `ExpertPolicy:DeclarationCriteria`. A new application after `NOT_ELIGIBLE`
can only be submitted with a material change for each failed criterion (`MATERIAL_CHANGE_REQUIRED` otherwise).
`ELIGIBLE` is per expert; Gate 2 is per service (below).

`MinYearsExperience`, `ReapplyNotEligibleDays` and `ReapplyCompetencyFailDays` in `appsettings.json` are only
defaults: a System Admin (`ExpertApprove`) changes them at `GET/PUT /api/v1/admin/experts/policy` (history at
`.../policy/history`), stored in `expert.policy_setting` / `expert.policy_setting_change`. Handlers read them
through `IExpertPolicyProvider`; each Gate 1 decision stores the minimum it applied.

Each decision adds an `ExpertEligibilityDecidedEvent` to `expert.notification_outbox` in the same transaction;
`ExpertNotificationPublisher` sends it to RabbitMQ (`ConnectionStrings:RabbitMq`) every 5 seconds, and the
notification service emails the applicant and keeps an in-app notification. The address is
`expert_profile.contact_email`, recorded from the token whenever the applicant saves, submits or supplements;
profiles without one are not notified. `Expert:NotificationPublisherEnabled=false` stops publishing
(Development only; messages wait in the outbox).

## Gate 2 (competency review per service)

After `ELIGIBLE`, the expert registers each catalog service (`POST /api/v1/experts/me/qualifications`), which
opens an `expert_service_qualification` in `COMPETENCY_REVIEW`. The reviewer gives PASS / FAIL /
NEED_MORE_INFORMATION for each of C1…C5 (`POST /api/v1/admin/experts/qualifications/{id}/competency-decision`);
every result needs a note, and PASS or FAIL must cite at least one file of the qualification (its Gate 1 files
plus the files added for the service, code `COMPETENCY`). One file may support several competencies
(`competency_assessment_evidence`). The outcome follows: any FAIL → `FAIL` (the service can be registered again
after `ExpertPolicy:ReapplyCompetencyFailDays`, linked to the failed one), otherwise any NEED_MORE_INFORMATION →
the expert uploads files and supplements the same qualification, all PASS → `PENDING_FINAL_APPROVAL`.
The Gate 2 reviewer is stored so final approval (not built yet) can require someone else (BR-E33).
Each decision publishes an `ExpertCompetencyDecidedEvent` through the same outbox.

## Pricing, availability and the Marketplace

- Platform fee (`/api/v1/experts/admin/platform-fees/{serviceCode}`, permission `PricingManage`): a System Admin sets
  the platform's percent (0–99) of each catalog service. `platform_fee` is append-only; the current rate is the latest
  row, and review cases freeze the percent they were booked with. Setting the first rate opens the service for pricing.
- Expert price (`/api/v1/experts/me/services/{serviceCode}`, signed in; Gate 2 checked by the domain): experts approved for the
  service (Gate 2) set their own fee (10,000–1,000,000,000 VND, steps of 1,000) and delivery time (1–720 hours) to
  compete; no approval. One `service_offering` per expert and service; responses show the net amount after
  the platform fee.
- Availability (`/api/v1/experts/me/availability`): `expert_profile.capacity`, how many cases the expert runs at once
  (1–20, shared by all services, 0 until set; `PUT` with `{ "capacity": n }`), and a per-service `accepting_requests`
  switch. `active_cases` counts accepted cases holding a slot; only the case flow changes it (taken on accept, freed
  when the case ends). Lowering the capacity never touches running cases.
- Delivery time: the expert's `service_offering.turnaround_hours`; the Marketplace returns it as `slaHours` and the
  Review Case snapshots it at request time.
- Marketplace (`GET /api/v1/marketplace/experts`, public): an Expert–Service is listed when the account is ACTIVE, the
  service is APPROVED_FOR_SERVICE and ACTIVE in the catalog, the expert has set a price, requests are on and the expert
  has set a capacity (BR-M01, `MarketplaceRules`). A full expert stays listed with `freeSlots: 0` and cannot be booked. The portal context reports the missing step as a reason code.
- `expert_profile.account_status` is kept in sync by `AccountStatusChangedConsumer` (event published by auth) and by
  the token whenever the expert saves something.

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
