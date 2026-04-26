# agents.md — today-little-log

## Purpose
Personal life PWA. Daily Scoreboard (user-defined check/output items, no-zero-day streak) + AM/PM rituals + journal + habits + Eisenhower tasks + memento mori life grid.

## Stack
- React 19 SPA (React Router v7), Vite 8, TypeScript
- Tailwind CSS v4 + shadcn/ui (Radix)
- Turso (libSQL) + Drizzle ORM, migrations in `drizzle/migrations/`
- better-auth (Google provider) — sessions in Turso `session` table
- Playwright e2e (`tests/`)
- Cloudflare Pages — `dist/` static + `functions/api/*` Pages Functions
- pnpm

## Repo structure
```
src/
  App.tsx             # React Router routes (9 routes)
  pages/              # Auth, Index, Rituals, Focus, Memories, Review, Life,
                      # Habits, Tasks, Eisenhower, NotFound
  components/         # ~20 feature components + ui/
  hooks/              # One per domain (useScoreboard, useDailyCheckins, useTasks, etc.)
  lib/
    api.ts            # apiFetch() wrapper for /api/*
    auth-client.ts    # Better Auth React client
    mementoMori.ts    # Life-weeks math + quotes
    xp.ts             # XP rewards / score deltas
    psiScore.ts       # AI-scored brain pressure
  db/schema.ts        # SINGLE source of truth — used by drizzle-kit AND CF Pages functions
functions/api/
  _helpers.ts         # createDb, createAuth, requireUserId, json (env type)
  [resource].ts       # Dynamic router: profiles, daily-checkins, journal-entries,
                      # tasks, habits, habit-logs, user-stats
  scoreboard-items.ts # Single-resource (exact-match wins over [resource])
  scoreboard-logs.ts  # Same
  auth/[[all]].ts     # Better Auth catch-all (GET+POST /api/auth/*)
drizzle/migrations/   # SQL migrations (0001..0004 applied)
drizzle.config.ts     # Turso dialect, schema = src/db/schema.ts
wrangler.toml         # name, pages_build_output_dir=dist, nodejs_compat
.husky/pre-push       # lint → tsc --noEmit -p tsconfig.app.json → pnpm build → secret-scan
vite.config.ts        # PWA (autoUpdate, skipWaiting, clientsClaim), port 8080
```

## Key commands
```bash
pnpm dev        # vite (localhost:8080)
pnpm build      # vite build → dist/
pnpm preview    # vite preview
pnpm test:e2e   # playwright
pnpm lint       # eslint
pnpm run deploy # vite build + wrangler pages deploy dist/
```

## Architecture notes

- **Single schema**: `src/db/schema.ts` is the only schema file. Drizzle migrations + CF Pages functions both import from it. No duplicate.
- **CF Pages routing**: `[resource].ts` matches single-segment `/api/<x>`. Exact-match files (`scoreboard-items.ts`, `scoreboard-logs.ts`) win when name collides. `auth/[[all]].ts` catches `/api/auth/*`.
- **CF Pages auth**: `functions/api/auth/[[all]].ts` builds a better-auth instance per request from `context.env`. Web-standard fetch API.
- **`requireUserId(request, env, db)`**: in `functions/api/_helpers.ts` — returns `userId` or `null`. All data routes auth-gate via this.
- **Secrets**: stored as CF Pages encrypted secrets (`wrangler pages secret put`):
  `BETTER_AUTH_SECRET`, `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`,
  `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`. `BETTER_AUTH_URL` is plaintext in `wrangler.toml [vars]`.
- **OAuth**: Google client `207924374505-...`. Authorized redirect URI must include
  `https://today-little-log.pages.dev/api/auth/callback/google` (and localhost for dev).
- **Deploy gotcha**: CF Pages git auto-deploy has stripped functions in the past — always deploy via `pnpm run deploy` (manual wrangler). Recommend disabling Git integration in CF dashboard.
- **PWA**: `vite-plugin-pwa` + Workbox, `registerType: autoUpdate` + `skipWaiting` + `clientsClaim` so new bundles activate immediately on next nav.
- **TanStack Query**: optional — most hooks use plain useState + apiFetch.
- **Gamification**: kept = XP + StreakBadge. Removed = Mana, LifeScore, PSI badges (PSI score still scored in AmRitual).
- **`@saas-maker/ai` vendored** at `file:vendor/saas-maker-ai`.
- **Pre-push gates**: lint, tsc, build, secret-scan. No skip without reason.

## Active context
- Scoreboard live, ~7 default items seeded for primary user.
- Home is hero + Scoreboard + Today entry only. Other surfaces split to dedicated pages.
- Aggressive prune `9631951` removed 9 pages + 20 components + 11 hooks; `25625a2` restored Review/Memories/Rituals/Focus/IdentitySetter as separate pages.
