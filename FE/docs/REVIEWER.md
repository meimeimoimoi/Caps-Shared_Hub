# Reviewer workspace

Development entry: `/reviewer`. Uses the shared AppHeader, AppSidebar, CustomSelect,
Button, FormField, Modal, StatusBadge, DemoBanner and Pagination components. The
existing application theme, motion boundary and English/Vietnamese translations apply.

## Routes

- `/reviewer`: assigned applications, applicant/application/service search, gate and status filters.
- `/reviewer?gate=GATE_1` and `?gate=GATE_2`: filtered work queues.
- `/reviewer/gate-1/:id`: EV-01–EV-06 eligibility assessment and decision.
- `/reviewer/gate-2/:id`: C1–C5 evidence/assessment drafts for one expert–service qualification.
- `/reviewer/history`: immutable demo decision snapshots, including evidence, policy, actor and time.

## Data and access

`VITE_REVIEWER_DATA_SOURCE=demo` (development default) loads synthetic fixtures. No
passwords, identity files, uploaded evidence or decisions are persisted in browser storage.
Leaving the workspace or reloading clears this isolated session. A banner discloses the
demo at every route. Production and non-demo mode display an API-unavailable screen;
real permissions and assignments have not been connected. Authorized Reviewer is a
functional actor, not an assumed global RBAC role (BR-E32).

The read-only demo selector revokes both review permissions. Domain validation checks
permission, record assignment, current status and Gate 1 success before Gate 2. Draft
changes have navigation/reload protection. Closed decisions cannot be overwritten.

## Business rules

Gate 1 PASS creates a pending Gate 2 qualification for the explicitly requested service.
NEED_MORE_INFORMATION stays at the current gate in the same application. Gate 1
NOT_ELIGIBLE and Gate 2 FAIL produce the configured earliest reapplication date and
retain assessment notes and failed criterion results for guidance. Gate 2 PASS only
produces PENDING_FINAL_APPROVAL, never APPROVED_FOR_SERVICE. No final-approval action
exists in the Reviewer workspace.

The development policy carries minimum experience and cooldowns as configuration,
not constants in transition logic. Each criterion requires a result, evidence reference
and note; every decision requires human rationale. Passing also requires resolving
flagged discrepancies. AI does not make a decision.

**C1–C5 definitions are unresolved in the supplied business documents.** The actual
demo policy therefore disables final Gate 2 decisions while allowing in-memory drafts.
The transition engine supports a configured Gate 2 policy, but the UI does not
invent or activate definitions. API integration must supply versioned criteria,
eligibility applicability, current assignments/permissions, evidence access and
server-side decision/audit enforcement. No HTTP endpoint contract is invented here.

## Verification

Run from `FE`:

```
npm run build
npm run lint
```

Manually verify permissions, assignments, evidence and note validation, decision consistency, immutable history and per-service isolation.
