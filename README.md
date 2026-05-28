# Today Little Log

A personal life PWA for daily scoring, journaling, rituals, habits, tasks, and
reflection. The app is intentionally quiet: it helps capture the day, maintain a
no-zero-day scoreboard, and keep personal routines visible without becoming a
heavy productivity system.

Live app: <https://today-little-log.pages.dev>

## What It Does

- Daily scoreboard with user-defined check/output items and monthly scoring.
- Journal entries and memory review surfaces.
- AM/PM rituals, focus planning, habits, tasks, and Eisenhower views.
- Memento mori life grid for long-range perspective.
- Google sign-in through better-auth.
- Cloudflare Pages Functions API backed by Turso/libSQL.
- PWA install/update flow through `vite-plugin-pwa`.

## Deployment & External Services

| Concern | Service |
|---------|---------|
| Hosting | Cloudflare Pages (`today-little-log`) + Pages Functions backend (`functions/api/`) |
| Database | Turso (libSQL) |
| Auth | better-auth + Google OAuth |
| CI/CD | GitHub Actions — auto-deploy on push to `main` |

## Stack

- React 19 + Vite
- Tailwind CSS + shadcn/ui
- Better Auth with Google sign-in
- Turso/libSQL + Drizzle ORM
- Cloudflare Pages Functions under `functions/api/`
- PWA via `vite-plugin-pwa`

## Local Development

```sh
pnpm install
cp .env.example .env.local
pnpm dev
```

The local app runs at <http://localhost:8080>.

Required env vars:

- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`
- `BETTER_AUTH_URL`
- `BETTER_AUTH_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `VITE_BETTER_AUTH_URL`
- `VITE_SAASMAKER_API_KEY`

Google OAuth callback URLs should include:

- `http://localhost:8080/api/auth/callback/google`
- `https://today-little-log.pages.dev/api/auth/callback/google`

## Repository Layout

```text
src/App.tsx              React Router routes
src/pages/               scoreboard, rituals, focus, memories, review, life, habits, tasks
src/components/          feature components and shadcn/ui primitives
src/hooks/               domain hooks for scoreboard, tasks, habits, journals
src/lib/api.ts           /api/* fetch wrapper
src/lib/auth-client.ts   better-auth client
src/db/schema.ts         single source of truth for Drizzle and Pages Functions
functions/api/           Cloudflare Pages Functions backend
drizzle/migrations/      Turso/libSQL migrations
```

## Scripts

```sh
pnpm dev        # Vite dev server
pnpm build      # production build into dist/
pnpm build:dev  # development-mode build
pnpm typecheck  # TypeScript check (tsc --noEmit)
pnpm preview    # preview built app
pnpm lint       # ESLint
pnpm deploy     # build and wrangler pages deploy dist/
```

## Deploy

Deployed on Cloudflare Pages project `today-little-log`. The Pages Functions
backend lives in `functions/api/`, and `wrangler.toml` points Pages at `dist/`.

The repo's agent notes recommend manual Wrangler deploys for reliability:

```sh
pnpm deploy
```

## Operating Notes

- `src/db/schema.ts` is the single schema source for Drizzle and Pages Functions.
- Exact-match Pages Function files such as `scoreboard-items.ts` and `scoreboard-logs.ts` win over `[resource].ts`.
- Secrets live in Cloudflare Pages encrypted secrets; do not commit local env files.
- PWA updates use `autoUpdate`, `skipWaiting`, and `clientsClaim`, so new builds activate quickly.
- Keep the app focused. Avoid adding new productivity surfaces unless they support the daily-score/journal loop.

## Verification

For behavior changes, run:

```sh
pnpm typecheck
pnpm lint
pnpm build
```

For routing, auth, or API changes, add the smallest relevant browser or e2e check
before deploying.

<!-- ACTIVE-AI-TASK-LOG:START -->
## Active AI Task Log

This section is maintained by the SaaS Maker Active-AI product/design loop so future agents do not reopen duplicate UI tasks.

- Business lane: P1 Explore
- Rule: do not create another broad "improve the UI" task unless the acceptance criteria differ materially from the tasks listed here.
- Source of truth for task status: SaaS Maker task board. README entries are durable context only.

| Task ID | Title | Status |
|---------|-------|--------|
| 31c58939-ae7f-4de3-bbed-8dcb4f6bc64c | make first entry action impossible to miss | done |
| 40724c96-bb3e-4a26-bed4-472be0e54c0a | add streak recovery copy | done |
| baacd5cf-6499-4694-ba71-27097e57edd8 | add weekly reflection preview | done |
| a46b5b64-8b99-4385-8e1e-4e85746aff30 | add private-by-default trust note | done |

Changes for a46b5b64: added "Private by default — only you can read what you write here." below the Save Entry button in `TodayPrompt.tsx` editing state. Shown only while composing a new/edited entry. No auth, schema, or API changes.

Changes for 40724c96: added streak recovery banner in `Scoreboard.tsx` — appears when ≥1 past tracked day has no log entries and today is also empty. Gentle copy ("Streaks break. The only day that matters right now is today."), "Write today ↓" button scrolls to the scoring matrix. Uses `useRef` + `scrollIntoView`. No auth/schema/deploy changes.

Changes for baacd5cf: added `WeeklyReflection.tsx` — a static sample card rendered on the guest landing page below `HomeHero`. Summarizes seven illustrative day entries with totals, a 7-day strip, best/hardest day callouts, and a one-line pattern. Demonstrates the payoff from daily micro-logging without touching schema, auth, or API.
<!-- ACTIVE-AI-TASK-LOG:END -->
