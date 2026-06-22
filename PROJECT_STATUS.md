# today-little-log — PROJECT STATUS

Last updated: 2026-06-20

## Why/What

Today Little Log is a personal life PWA intentionally narrowed to quiet daily capture: **daily scoreboard**, **habits**, and **journal**, plus AM/PM rituals and a focus timer. Data captured here is historical context for a future AI layer (explicitly gated on a separate consumer product). The app stays private by default — no social feeds or coaching marketplace.

Live: [today-little-log.pages.dev](https://today-little-log.pages.dev)

## Dependencies

| Layer | Choice |
|-------|--------|
| Frontend | React 19, Vite 8, React Router, Tailwind CSS, shadcn/ui |
| Backend | Cloudflare Pages Functions (`functions/api/`) |
| Database | Turso (libSQL) + Drizzle ORM |
| Auth | better-auth + Google OAuth |
| PWA | `vite-plugin-pwa` install/update flow |
| AI SDK | Present for future layer; not active product surface |
| Deploy | Cloudflare Pages project `today-little-log` |
| CI | GitHub Actions — auto-deploy on push to `main` |

**Local dev:** `pnpm install && cp .env.example .env.local && pnpm dev` → http://localhost:8080

**Key check:** `tests/verify_core_flows.spec.ts` (Playwright guest-mode core flows)

**Schema source of truth:** `src/db/schema.ts` (shared by Drizzle client and Pages Functions)

```
React SPA (guest mode + Google auth)
    │
    ├── Scoreboard (daily check/output items, monthly scoring)
    ├── Habits (add, log, edit, delete with confirmations)
    ├── Journal (entries, delete confirmations)
    ├── Rituals (AM/PM flows)
    ├── Focus timer (start/stop, guest-capable)
    ├── Tasks + Eisenhower views (present; secondary to core three)
    └── Memories / Review / Life grid (reflection surfaces)

functions/api/ ──► Turso via Drizzle
better-auth ──► Google OAuth callbacks (localhost + Pages domain)
PWA service worker ──► offline shell + update prompts
```

**Navigation:** bottom nav + sidebar; stale mobile FAB and Vercel references removed.

**Guest mode:** core flows (habits, scoreboard, journal, focus) work without sign-in; Playwright suite validates guest lifecycle.

| Concern | Detail |
|---------|--------|
| Hosting | Cloudflare Pages `today-little-log` |
| Database | Turso — `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` |
| Auth | better-auth; callbacks: `http://localhost:8080/api/auth/callback/google` and production Pages URL |
| Deploy | `pnpm deploy` (recommended manual Wrangler path) or push to `main` |
| Smoke | `npx playwright test tests/verify_core_flows.spec.ts` |
| PWA | Verify service worker update after production deploys |
| Privacy | App stays private-by-default; no public user content feeds |

## Timeline

| Phase | Milestone |
|-------|-----------|
| Platform foundation | Cloudflare Pages + Functions, Turso/Drizzle, better-auth Google OAuth, PWA install/update |
| Core three surfaces | Daily scoreboard, habits, journal with bottom nav and sidebar routing |
| Rituals & focus | AM/PM rituals, focus timer (guest-capable) |
| Secondary surfaces | Tasks, Eisenhower, memories, review, memento mori life grid, about/privacy |
| Quality hardening | Global error boundary, delete confirmations, stale FAB removal, Vercel reference cleanup |
| Verification (2026-06-20) | Playwright guest-mode suite for habits, scoreboard, focus, journal; `.env.example`, CI auto-deploy |

## Products

**Live:** [today-little-log.pages.dev](https://today-little-log.pages.dev)

**Primary routes:** `/` (scoreboard) · `/habits` · `/journal` · `/rituals` · `/focus` · `/tasks` · `/eisenhower` · `/memories` · `/review` · `/life` (memento mori grid) · `/about` · `/privacy` · `/auth`

| Surface | Role |
|---------|------|
| Scoreboard | Daily check/output items, monthly scoring |
| Habits | Add, log, edit, delete with confirmations |
| Journal | Entries with delete confirmations |
| Rituals | AM/PM flows |
| Focus | Timer start/stop (guest-capable) |
| Tasks / Eisenhower | Secondary productivity views |
| Memories / Review / Life | Reflection surfaces |

## Features (shipped)

### Platform and deploy
- Cloudflare Pages frontend with Pages Functions backend in current architecture.
- Turso/libSQL persistence via Drizzle ORM; migrations in `drizzle/migrations/`.
- better-auth Google sign-in with documented OAuth callback URLs (localhost + production).
- PWA install and update behavior through `vite-plugin-pwa`.
- `wrangler.toml` points Pages at `dist/`; `pnpm deploy` manual path documented for reliability.
- Checked-in `.env.example` listing `TURSO_*`, `BETTER_AUTH_*`, `GOOGLE_*`, `VITE_*` vars.
- GitHub Actions CI auto-deploy on push to `main`.

### Core product surfaces (narrowed scope)
- **Daily scoreboard** on `/` with user-defined check/output items and monthly scoring display.
- **Habits** at `/habits` — add, log values, edit titles, delete with confirmation dialogs.
- **Journal** at `/journal` — entries with delete confirmations.
- **AM/PM rituals** at `/rituals`.
- **Focus timer** at `/focus` — FocusMode start/stop works for guests.
- Bottom navigation and sidebar routing across core surfaces.

### Secondary surfaces (shipped, not primary scope)
- Tasks page and Eisenhower matrix views.
- Memories and review surfaces for historical reflection.
- Memento mori life grid at `/life`.
- About and privacy pages.

### Quality and UX hardening
- Global error boundary for runtime failures.
- Delete confirmations on Habits and Journal destructive actions.
- Stale mobile FAB removed.
- Vercel deployment references removed from codebase/docs alignment.
- Playwright guest-mode verification suite:
  - Habits: add → log → edit → delete lifecycle.
  - Scoreboard: matrix and totals render on home.
  - Focus: timer block start/stop.
  - Journal: entry add/delete flow.
  - Console error filtering ignores known benign noise (401, PostHog, vite HMR).

### Developer experience
- `src/lib/api.ts` fetch wrapper for `/api/*`.
- `src/lib/auth-client.ts` better-auth client.
- Domain hooks: scoreboard, tasks, habits, journals under `src/hooks/`.
- Scripts: `pnpm dev`, `build`, `typecheck`, `lint`, `preview`, `deploy`.

## Todo / Planned / Deferred / Blocked

### Planned
1. **AI consumer layer** — habit/journal/focus history ingestion for a separate AI product; blocked until that consumer is in flight (no premature AI features in this app).
2. **React hooks refactor** — address ~30 `react-hooks/set-state-in-effect` warnings as a dedicated pass (tech debt, not product blocker).
3. **Auth-path tests** — extend Playwright beyond guest mode to signed-in persistence once AI layer planning clarifies data model needs.

### Deferred
- Secrets rotation (operator-owned; not agent scope without explicit ask).
- Social sharing, public feeds, heavy analytics, coaching, quantified-self marketplace.
- New feature expansion beyond the three core surfaces until AI consumer layer starts.
- SaaS Maker `VITE_SAASMAKER_API_KEY` integrations beyond current wiring unless product scope expands.

### Blocked / Known gaps
- Hook-refactor pass (`set-state-in-effect` warnings) is tech debt — does not block core flows.
- AI layer explicitly gated on separate product effort — no timeline in this repo.
- Authenticated E2E coverage thinner than guest-mode suite.
- `VITE_SAASMAKER_API_KEY` in `.env.example` — verify whether still required for production or legacy.
