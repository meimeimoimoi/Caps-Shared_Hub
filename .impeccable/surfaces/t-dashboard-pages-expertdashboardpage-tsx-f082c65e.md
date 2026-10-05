---
version: 1
slug: "t-dashboard-pages-expertdashboardpage-tsx-f082c65e"
primary_target: "FE/src/features/expert-dashboard/pages/ExpertDashboardPage.tsx"
related_targets: ["FE/src/app/layouts/expert/ExpertLayout.tsx"]
---

# Expert overview

Scope: `/expert/overview`, portal layout and read-only operational data. Mode: Operate. English UI. Registration remains independent.

Audience: approved experts working through CIT reviews in an office, under daytime lighting. A light neutral surface keeps case status and deadlines readable during repeated daily visits.

## Direction contract

THESIS: Pair review activity charts with actionable case work. Distinguish historical trends, workload totals, and the loaded case projection. No fabricated financial metrics.

OWN-WORLD: Inherit the incumbent orange/black portal identity, dark sidebar and light work surfaces; system sans, restrained orange actions, compact status labels and ruled rows. This extension does not replace the global visual system.

STORY: Verify access, scan expert versus user deadlines, inspect per-service booking reasons. Only registered routes may be actions.

FIRST VIEWPORT: Compact account header, overview title/actions and timestamp, workload totals and explicit overdue attention, then review trend beside loaded-case distribution. The queue and service readiness follow, with activity and performance below. The default is a chart-first hybrid; the optional layout question received no answer after a reasonable wait. Overview alone permits a wider main surface (maximum 1800px); responsive CSS stacks sections on smaller screens.

FORM: Precisely specified implementation from the dashboard plan; no concept seed required for this bounded brief. Code-led implementation; no illustrative raster required.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

Open dependencies: backend contracts remain pending. Optional daily analytics has no fabricated live fallback; absent history shows unavailable. Demo trends use independent 28-day fixtures; distribution covers only loaded cases (5 of 13 in the default sample). Finance remains unavailable; case detail is an interactive session-only preview. Timezone comes from projection and is shown explicitly. Verification is source-only: browser inventory is empty, so no desktop/mobile visual approval or screenshot captures exist. Preserve registration-scoped docs/DESIGN.md and its sidecar.

Trend contract: select 7/28 calendar days anchored to the latest reported day in the supplied timezone. Keep the latest aggregate for each calendar day; use date-based x spacing and preserve missing dates without zero-filling. Invalid timezone falls back to UTC with an explicit chart note. This history projection does not alter operating deadlines. Overdue labels describe the case deadline generically. Latest validation: all 16 tests pass (5 analytics, 11 existing), build and architecture pass, lint retains four unrelated existing warnings, mechanical detector returns `[]`. Final targeted source review confirms timezone guarding, overdue labels and calendar windows are resolved; disposition: ship within source-reviewed scope. Visual approval remains unavailable.
