# FE — Caps Shared Hub (Vite + React 19 + TS strict)

Architecture shell (P3 done): router + providers + real auth flow via gateway.

## Quick start

```bash
cp .env.example .env.development
npm install
npm run dev      # http://localhost:5173 -> redirect /dashboard (login first)
```

BE must be running: gateway `http://localhost:5190`, auth `http://localhost:5194`.
`VITE_API_URL=http://localhost:5190` (see `.env.development`).

## Routes

- `/login` — public, `LoginForm` calls `POST /api/auth/login` through gateway
- `/dashboard` — protected by `ProtectedRoute` (zustand persist)
- `*` — 404

## Conventions

- `src/app/` — shell: `App.tsx`, `providers/` (QueryClient), `routes/`
- `src/features/<name>/` — `{components,hooks,store,api,types}` co-located
- `src/lib/api-client.ts` — axios + timeout 15s + Bearer + 401 auto-logout + typed `api.get/post`
- `src/components/ui/` — shadcn-style primitives (button/input/badge)
- State: `zustand/persist` for auth session, `@tanstack/react-query` for server state

## Scripts

- `npm run dev` / `npm run build` / `npm run lint` (`oxlint`) / `npm run format`
