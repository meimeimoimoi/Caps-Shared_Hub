# FE — Caps Shared Hub (Vite + React 19 + TS strict)

Router + providers + authentication through the backend gateway. The frontend uses the team's original feature-based structure.

## Quick start

```bash
cp .env.example .env.development
npm install
npm run dev
```

BE must be running: gateway `http://localhost:5190`, auth `http://localhost:5194`.
`VITE_API_URL=http://localhost:5190` (see `.env.development`).
On Windows PowerShell with script execution disabled, use `npm.cmd`.

## Source structure

```text
src/
  app/                     App shell, providers, routes and role layouts
  pages/                   Route screens; admin/expert screens grouped in subfolders
  features/<name>/
    components/            Feature-specific components
    hooks/                 React behavior and data fetching
    store/                 Zustand/client state when needed
    api/                   Feature HTTP calls through lib/api-client
    types/                 Feature TypeScript types
    utils/                 Feature validation and pure helpers when needed
    constants.ts           Feature constants when needed
  components/ui/           Reusable UI, grouped by purpose
    layout/                App header/sidebar/account menu, case/tool headers
    forms/                 Inputs, selects, date picker and field helpers
    navigation/            Pagination and workflow progress
    feedback/              Dialogs, toasts and help tips
    display/               Badges and document notes
    actions/               Buttons and decision bars
  components/auth/         Login presentation components
  lib/                     API client, query client and generic utilities
  hooks/                   Reusable hooks
  utils/                   Generic validation helpers
  assets/                  Shared logos and assets
  styles/                  Global CSS and design tokens
  main.tsx                 React entry point
```

## Conventions

- `src/app/` — shell: `App.tsx`, `providers/` (QueryClient), `routes/`, and role layouts.
- `src/features/<name>/` — `{components,hooks,store,api,types}` co-located. Add folders only when used; feature helpers and constants stay with their feature.
- `src/pages/` — route screens compose feature components and hooks. Features do not import screens or the app shell.
- `src/lib/api-client.ts` — axios + timeout 15s + Bearer + 401 session expiration + typed `api.get/post`.
- `src/components/ui/` — reusable UI grouped by purpose. Import directly from the
  owning group, for example `@/components/ui/forms/input` or
  `@/components/ui/layout/app-sidebar`. Avoid a single barrel exporting all groups.
- State: `zustand/persist` for auth session, `@tanstack/react-query` for server state.
- Imports may target the owning file directly. Feature `index.ts` exports are optional; no mandatory public-API layer.
- Common utilities and UI do not import business features, pages or app composition. Avoid circular feature dependencies.
- The team structure does not use `src/shared/` or feature `model/` folders.

## Routes

- `/login` — public; email login calls `POST /api/auth/login` through the gateway.
- `/expert/register` — public expert onboarding.
- `/dashboard` — protected application dashboard.
- `/expert/overview`, `/expert/cases`, `/expert/queue`, `/expert/active` — expert workspace.
- `/expert/cases/:id` — case detail.
- `/expert/services`, `/expert/income`, `/expert/profile` — expert services, income and profile.
- `/expert/settings/:section` — account settings.
- `/admin/experts`, `/admin/experts/pending`, `/admin/experts/:id` — admin screens; admin auth integration is pending.
- `*` — Not Found.

Expert workspace routes use `ExpertRoute`; demo access is configured separately from production authentication.

## Scripts

- `npm run dev` / `npm run build` / `npm run lint` (`oxlint`) / `npm run format`.
- `npm run check:architecture` checks the agreed folder structure, common-module boundaries and circular feature dependencies. TypeScript build checks import resolution.

Formatting the entire project may touch unrelated files; format deliberately.

## Draft Workspace

Drafting routes: `/drafts`, `/drafts/templates`, `/drafts/templates/:templateVersionId`,
`/drafts/:workspaceId/input`, `/drafts/:workspaceId/generations/:jobId`,
`/drafts/:workspaceId/versions/:draftVersionId`, and `/drafts/:workspaceId/history`.
The feature uses the user session, not Expert Portal permissions. Navigation uses a
data router so unsaved-input protection also covers browser Back.

For an isolated development preview, add to `.env.development.local` and restart Vite:

```env
VITE_DRAFT_DATA_SOURCE=mock
VITE_DRAFT_DEMO_ACCESS=true
VITE_DRAFT_MOCK_SCENARIO=ready
VITE_DRAFT_MOCK_LATENCY_MS=350
```

Open `/drafts`. Mock alone does not bypass authentication; `DEMO_ACCESS` is a separate
development-only opt-in. Production always uses API and authentication. Demo data is
synthetic, held in memory, separated by session/scenario, and resets on reload.
The scenario selector and reset action are only shown in mock mode. There is no
automatic mock fallback when HTTP fails. Do not enter confidential data in demo mode.

Draft and Expert layouts reuse `components/ui/layout/app-sidebar.tsx` for branding,
navigation groups, the selected-item indicator and the collapse/expand control.
Each layout supplies its own routes, active item and permissions. Expanded mode
uses the full logo; collapsed mode uses the logo icon. Draft mobile navigation
opens the same component in a native dialog.

Both layouts also use `components/ui/layout/app-header.tsx` for the header layout and mobile
navigation button. Its `context` and `actions` slots keep breadcrumbs, account data,
language and theme behavior in their owning layouts. Header colors, height, typography
and spacing are standardized; `components/ui/layout/app-account-menu.tsx` provides the same avatar, dropdown
and dismissal behavior in both workspaces. Layouts supply actual account data and only
the account actions available to their users.

Only the first template has a proposed demo schema (the nine visible reference fields).
Other template cards clearly state that their schemas are unavailable. No attachments
or conditional input rules are invented for this schema. Full schemas, envelopes,
job/assessment contracts and charging policy still require backend agreement.

Demo export creates a real `.txt` artifact containing the AI disclaimer and version
references. It does not create PDF/DOCX or charge credit. Demo review records only a
version-pinned handoff in memory. Production export and review submission remain
explicitly unavailable until their contracts are connected. See [DRAFTING.md](DRAFTING.md)
for adapter boundaries, business-rule traceability and verification scenarios.

Theme conventions and migration: [THEMING.md](./THEMING.md).
