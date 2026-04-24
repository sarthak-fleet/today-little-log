# agents.md — today-little-log

## Purpose
Personal life PWA — daily journal, habits, Eisenhower matrix tasks, emotion logging, memento mori life grid, and XP/mana/PSI gamification.

## Stack
- Framework: React 19 SPA (React Router v7), Vite 8
- Language: TypeScript
- Styling: Tailwind CSS v4 + shadcn/ui (Radix UI)
- DB: Turso (libSQL via `@libsql/client`) + Drizzle ORM — migrations in `drizzle/`
- Auth: better-auth (Google provider) — replaced Supabase → NextAuth → better-auth (current)
- Testing: Playwright (e2e in `tests/`)
- Deploy: Vercel (frontend `vite build → dist/`; serverless functions in `api/`)
- Package manager: pnpm

## Repo structure
```
src/
  App.tsx             # React Router routes
  pages/              # Index, Tasks, Habits, Life, etc.
  components/         # 40+ feature components
  hooks/              # One hook per domain (useHabits, useTasks, useEmotions, etc.)
  lib/
    api.ts            # apiFetch() wrapper for all /api/* endpoints
    auth-client.ts    # Better Auth React client
    mementoMori.ts    # Life weeks / mortality math (4,000-week grid)
    xp.ts             # XP / gamification
    psiScore.ts       # Personal score computation
    protocol.ts       # AM/PM ritual definitions
  db/schema.ts        # Drizzle schema (client-side reference copy — keep in sync with api/)
api/                  # Vercel serverless functions
  _lib/
    auth.ts           # getUserId() — cookie + session lookup
    auth-instance.ts  # Better Auth server instance config
    db.ts             # Drizzle client (Turso)
    schema.ts         # Drizzle schema (MUST STAY IN SYNC with src/db/schema.ts)
  auth.ts             # Better Auth handler
  chat.ts             # AI chatbot endpoint
  [resource].ts       # Generic CRUD router
  <entity>.ts         # Per-entity endpoints (habits, tasks, emotions, etc.)
drizzle/migrations/   # SQL migration files
drizzle.config.ts     # Turso dialect
scripts/
  bundle-api.mjs      # esbuild bundler for api/ → Vercel deployment
vendor/saas-maker-ai/ # Vendored @saas-maker/ai package (file: dep)
vite.config.ts        # PWA config, port 8080
```

## Key commands
```bash
pnpm dev        # vite (localhost:8080) — frontend only
pnpm build      # vite build → dist/ (api/ bundled separately by esbuild for Vercel)
pnpm preview    # vite preview
pnpm test:e2e   # playwright test
pnpm lint       # eslint
```

## Architecture notes
- **Auth history**: Supabase → NextAuth → better-auth (current). `api/_lib/auth-instance.ts` is the server instance.
- **Schema duplication**: `api/_lib/schema.ts` and `src/db/schema.ts` must stay in sync — any schema change needs updating in BOTH files.
- **API layer**: Vercel serverless functions in `api/`. Bundled with esbuild via `scripts/bundle-api.mjs`. Generic CRUD via `api/[resource].ts`; complex entities get dedicated files. Knip does not understand this pattern — all `api/` files flagged as unused by knip but ARE used.
- **`@saas-maker/ai` vendored**: stored as `file:vendor/saas-maker-ai` — local copy from the saas-maker sibling project, not from npm registry.
- **PWA**: `vite-plugin-pwa` + Workbox. Offline caching, manifest, install prompts. Theme color `#e86a1f`, standalone display.
- **TanStack Query**: all data fetching uses `@tanstack/react-query`. One hook per resource domain.
- **Gamification**: XP system, mana, streak badges, PSI score, Eisenhower matrix, memento mori 4,000-week life grid.
- Husky pre-push hook configured.

## Active context
