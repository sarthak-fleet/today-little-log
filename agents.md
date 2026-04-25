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
- Deploy: Cloudflare Pages (`vite build → dist/`; API via `functions/` CF Pages functions)
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
functions/            # CF Pages serverless functions (deployed alongside dist/)
  api/auth/
    [[all]].ts        # Better Auth catch-all handler (GET + POST /api/auth/*)
api/                  # Legacy Vercel-style functions (NOT deployed to CF Pages, kept for reference)
  _lib/
    auth.ts           # getUserId() — cookie + session lookup
    auth-instance.ts  # Better Auth server instance config (Node handler)
    db.ts             # Drizzle client (Turso)
    schema.ts         # Drizzle schema (MUST STAY IN SYNC with src/db/schema.ts)
  auth.ts             # Better Auth handler (Vercel Node style — not used in production)
  [resource].ts       # Generic CRUD router
  <entity>.ts         # Per-entity endpoints (habits, tasks, emotions, etc.)
drizzle/migrations/   # SQL migration files
drizzle.config.ts     # Turso dialect
wrangler.toml         # CF Pages config (nodejs_compat, pages_build_output_dir=dist)
vite.config.ts        # PWA config, port 8080
```

## Key commands
```bash
pnpm dev        # vite (localhost:8080) — frontend only
pnpm build      # vite build → dist/
pnpm preview    # vite preview
pnpm test:e2e   # playwright test
pnpm lint       # eslint
pnpm deploy     # build + wrangler pages deploy dist/ (picks up functions/ automatically)
```

## Architecture notes
- **Auth history**: Supabase → NextAuth → better-auth (current). `functions/api/auth/[[all]].ts` is the CF Pages auth handler; `api/_lib/auth-instance.ts` is the Node-style instance (not used in prod).
- **CF Pages auth**: `functions/api/auth/[[all]].ts` creates a better-auth instance per-request using `context.env` (CF env bindings). Uses `auth.handler(request)` — web-standard fetch API, no Node compat needed for auth itself. `@libsql/client` auto-selects its `workerd` export.
- **OAuth redirect URI**: Google OAuth client `645696112124-0478qc7vc4odr6e80cutm7dat5rka6gc` (today-little-log GCP project) must have `https://today-little-log.pages.dev/api/auth/callback/google` added as an authorized redirect URI in Google Cloud Console → APIs & Services → Credentials.
- **Schema duplication**: `api/_lib/schema.ts` and `src/db/schema.ts` must stay in sync — any schema change needs updating in BOTH files.
- **API layer**: The `api/` directory contains legacy Vercel-style functions. Only `functions/` is deployed to CF Pages. The other API routes (`[resource].ts`, etc.) are NOT yet ported to CF Pages functions — they need migration if backend features are needed.
- **`@saas-maker/ai` vendored**: stored as `file:vendor/saas-maker-ai` — local copy from the saas-maker sibling project, not from npm registry.
- **PWA**: `vite-plugin-pwa` + Workbox. Offline caching, manifest, install prompts. Theme color `#e86a1f`, standalone display.
- **TanStack Query**: all data fetching uses `@tanstack/react-query`. One hook per resource domain.
- **Gamification**: XP system, mana, streak badges, PSI score, Eisenhower matrix, memento mori 4,000-week life grid.
- Husky pre-push hook configured.

## Active context
