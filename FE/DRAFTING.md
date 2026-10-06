# Drafting integration and acceptance

This frontend implements the draft-workspace plan v5 against a **proposed UI contract**,
not a verified backend contract. `src/features/drafting/types/index.ts` owns the DTOs.
`api/draftApi.ts` selects HTTP or a lazy development mock. Components never read fixtures
or send HTTP directly. Replace the HTTP mapping after backend agreement; retain the UI DTOs.

## Integration decisions still required

- Confirm the full first-template schema, field IDs, validation and attachments. The
  nine-field fixture is an explicitly proposed subset; the other five schemas are absent.
- HTTP currently expects direct typed DTOs, full workspace/history arrays and ISO timestamps.
  Map the real response envelope and server pagination in the adapter when agreed.
- Proposed paths under gateway `/api/drafting`: templates and template detail; workspaces
  and workspace detail; input PUT; confirm POST; generations POST; generation detail GET;
  draft history GET; draft detail GET; assessment retry POST. The `/api` fallback does not
  receive a duplicate prefix. These paths do not assert that services are already deployed.
- Save and confirm send `expectedRevision`. Confirm/generate/assessment use
  `Idempotency-Key`. Backend must bind each key to actor, operation and payload and return
  the same result for retries. Client buttons alone cannot enforce idempotency.
- Generation status and readiness assessment are independent. Backend returns issues,
  checks and per-action eligibility. Frontend does not calculate legal readiness or credits.
- Export quote/result/reconciliation and review handoff are deliberately unsupported in
  the HTTP adapter. Enable `draftCapabilities` only with a real contract, including supported
  formats, embedded disclaimer, expiry, transaction reconciliation, artifact reuse and
  exact version references. No booking/payment endpoint is invented.
- Production authorization remains the gateway's responsibility. Draft routes use the
  existing auth session; no expert role is assumed. Queries include session/user, scenario
  and exact entity ID. Logout uses the existing private-cache clearing mechanism.
- Demo memory is reset on browser reload. HTTP resumes saved input, jobs and versions by
  reading their IDs; route entry never starts a mutation automatically. No sensitive input
  is persisted to localStorage. Polling stops at terminal state/error, on unmount, or after
  its bounded automatic checks; an explicit status check remains available.

## Business-rule traceability

- BR-D01: template detail and adapter recheck ACTIVE before create; inactive scenario.
- BR-D02: SchemaForm uses version fields; unsupported schemas cannot create a workspace.
- BR-D03: generation adapter accepts a confirmed snapshot ID, never Working Input.
- BR-D04: validation runs before confirmation in both form and adapter; invalid/agency-missing scenarios.
- BR-D05: confirmation appends a cloned snapshot; read-only snapshot dialog.
- BR-D06: generation and preview verify workspace/snapshot/template references.
- BR-D07: generation appends versions; changed Working Input never updates old draft content.
- BR-D08: chat-suggestion fixture creates editable input only; confirmation is still required.
- BR-D09: tax period is required and source applicability comes from returned metadata.
- BR-D10: synthetic sources are explicitly labeled; mock results are not approved legal knowledge.
- BR-D11: demo output copies confirmed user figures; no tax arithmetic or case facts are inferred.
- BR-D12: grounding-missing returns a blocking issue and no fabricated source.
- BR-D13: preview, snapshot and citation details show exact source/knowledge/template references.
- BR-D14: pending/failed assessment disables controlled actions; retry assessment keeps the draft.
- BR-D15: ReadinessPanel displays completeness, consistency, citations and unresolved issues.
- BR-D16: readiness has three distinct results and always carries the non-approval disclaimer.
- BR-D17: warnings appear before the action controls.
- BR-D18: revise from an exact version/snapshot; confirmation produces a new snapshot.
- BR-D19: review summary and adapter pin the selected draft and its references; receipt identity checked.
- BR-D20: quote/transaction results own charging information; no client balance deduction.
- BR-D21: regenerate creates a new draft from the same snapshot, preserving old versions.
- BR-D22: workspace template version remains pinned; no automatic template upgrade.
- BR-D23: blocked-reviewable allows demo review; blocked-service/handoff-blocked disallow it.

## Acceptance scenarios

Use the development-only scenario selector. Each scenario has an independent in-memory store.

1. Empty: browse templates, inspect the first template, create workspace, enter the required
   fields, save, review the confirmation summary and check the initially unchecked checkbox.
   Generate and preview; inspect Snapshot and Sources. Other cards must explain unsupported schema.
2. Invalid input / missing agency: no snapshot is created; error summary focuses the field.
   Money is formatted on screen while adapter values remain raw whole VND strings.
3. Save failed / conflict: keep local values and previous saved timestamp. Compare the returned
   saved revision explicitly before resubmitting. Navigation/Back/reload warns about unsaved input.
4. Generation failed / confirm then job fails / retry success: preserve the confirmed snapshot;
   retry generation does not confirm again. Unknown polling timeout exposes Check status rather
   than starting another job. Generation progress is explicitly synthetic in mock mode.
5. Ready / warnings / blocked reviewable / blocked service / grounding missing: inspect exact
   adapter eligibility, warnings and issue links. No user action can manually mark an issue READY.
6. Assessment pending / failed: actions remain blocked; bounded polling or retry assessment
   does not create another draft. Source unavailable shows an unavailable source, not invented text.
7. Version history / same snapshot / stale input / revise: open an old version, revise it,
   generate a new version and revisit the old one. Regenerate preserves its snapshot ID. History
   marks selection separately from artifact events and can retrieve the existing artifact.
8. Export success / failed / insufficient credit / expired quote / unknown transaction / failed
   download: no default agreement, real TXT only, same operation key on retry, explicit reconciliation
   and artifact reuse. The file includes the disclaimer and exact draft/snapshot/template references.
9. Review success / failed / blocked: summary pins the version; only adapter receipt shows success,
   with no claim of booking, payment or notifying an expert. HTTP submission is unsupported.
10. Unauthorized / forbidden / unavailable version / network error: show clear recovery, never
    silently open another version or fall back to mock. Reload demo resets memory with a visible notice.

Conditional input and upload scenarios are excluded until a schema requires them. Their absence
does not imply attachments or conditional business rules are supported. Production API/auth,
real generation, billing and Flow 5 end-to-end checks require the agreed backend services.

## Verification performed

- TypeScript/Vite build and architecture boundaries passed. Lint has the four existing
  warnings in shared button/badge and expert registration; Drafting adds no lint warnings.
- Executed adapter assertions for required validation, revision conflicts, snapshot/draft
  immutability, repeated idempotency keys, regeneration, exact references, action eligibility,
  pending/failed assessment, unknown job status, export format limits and transaction reconciliation.
- React server-render smoke checks exercised the route screens with seeded Query data.
  These are render/contract checks, not browser interaction tests.
- The mechanical design detector reported no findings. Desktop/mobile visual inspection,
  keyboard interaction and native-dialog behavior remain unverified because the browser tool
  reported no available browser surfaces in this session.
