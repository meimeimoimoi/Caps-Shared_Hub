# Shared Hub Frontend

React + TypeScript + Vite. Source code follows Feature-based Architecture.

## Run locally

```bash
npm install
npm run dev
```

Backend gateway: `http://localhost:5190`. Configure `VITE_API_URL` using `.env.example`.
On Windows PowerShell with script execution disabled, use `npm.cmd`.

## Source structure

```text
src/
  app/                         Application composition, providers and routing
    layouts/                   Role-specific shells (e.g. expert sidebar layout)
    pages/                     Dashboard shell and generic Not Found page
    providers/
    routes/
  features/
    auth/
      api/                     Authentication HTTP calls
      components/
      hooks/
      model/                   Session store, types and account validation
      pages/                   Login page
      index.ts                 Public API
    expert-context/
      api/                     Expert profile and readiness HTTP calls
      hooks/                   Context provider hook
      model/                   Expert context types
      index.ts                 Public API
    expert-dashboard/
      api/                     Dashboard HTTP calls
      components/              Dashboard widgets, summaries and section states
      hooks/                   Dashboard data, case workspace and analytics logic
      model/                   View-models, types, analytics and test fixtures
      pages/                   Overview, cases, case detail, services, profile, settings
      index.ts                 Public API
    expert-registration/
      assets/                  Assets used only by this feature
      components/              Onboarding components and wizard steps
      hooks/                   Form, lifecycle and motion logic
      model/                   Onboarding types and constants
      pages/                   Expert registration page
      index.ts                 Public API
  shared/
    assets/
    hooks/
    lib/                       API client, utilities and generic validation
    styles/                    Global styles and existing design tokens
    types/
    ui/                        Reusable UI primitives
  main.tsx                     React entry point
```

## Dependency rules

- `main.tsx` composes the application. `app` may import feature public APIs and shared code.
- Features may import shared code and another feature's public API. Circular feature dependencies are forbidden.
- Shared code must not import features or app code.
- Across feature boundaries, import from `@/features/<name>`, never its internal folders.
- Inside a feature, use relative imports directly to the owning file. Do not import its own `index.ts`.
- Import shared modules directly, for example `@/shared/ui/button`. Avoid a global shared barrel.
- Feature `index.ts` files expose only intentional entry points, reusable capabilities and contracts.

`npm run check:architecture` checks these boundaries for static imports, re-exports and literal dynamic imports. It also detects cycles between features; TypeScript verifies module resolution during the build.

## Ownership conventions

- Group code by business capability, not by backend microservice or user role.
- Feature pages own the screen composition. Router files only wire routes and access guards.
- `app/pages` is reserved for application-level screens; it must not become a second home for business pages.
- Keep HTTP calls in feature `api/` modules using `shared/lib/api-client`.
- Use `model/` for feature types, validation, constants and stores. Keep React behavior in `hooks/`.
- Use TanStack Query for new server-state flows, local React state for local UI, and Zustand for genuinely shared client state. The existing login hook behavior is preserved by this refactor.
- Keep generic phone and DOM form validation in shared. Account registration validation belongs to auth and is reused by expert onboarding through the auth public API.
- Add folders only when needed. Tests stay next to the code they verify.
- Expert registration remains one onboarding feature because the current flow shares form and lifecycle state. Future independent profile, eligibility, service qualification and case-management modules should have their own features when implemented.
- Role-specific layouts belong in `app/layouts` when they are needed; do not duplicate a business feature per role.

## Routes

- `/login`: public login screen.
- `/expert/register`: public expert onboarding screen.
- `/expert/overview`: authenticated expert dashboard overview.
- `/expert/cases`: expert case list (all cases).
- `/expert/queue`: expert work queue (pending requests).
- `/expert/active`: expert active cases.
- `/expert/cases/:id`: individual case detail and review workspace.
- `/expert/services`: expert service readiness.
- `/expert/profile`: expert profile.
- `/expert/settings/:section`: expert account settings.
- `/dashboard`: authenticated application shell.
- `*`: Not Found.

Expert routes require authentication and the expert role guard (`ExpertRoute`). Pages remain lazy-loaded through each feature's public entry point.

## Validation

```bash
npm run check:architecture
npm run build
npm run lint
```

`npm run format` formats the project; use it deliberately because it touches unrelated files.
