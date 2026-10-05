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
  components/ui/           Reusable UI primitives
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
- `src/components/ui/` — reusable primitives (button/input/badge and other controls).
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
