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

<!-- FLEET-GUIDANCE:START -->

## Fleet Guidance

### Adding Tasks
- Add durable work items in SaaS Maker Cockpit Tasks when the task affects product behavior, deployment, user feedback, or fleet maintenance.
- Include the project slug, a concise title, acceptance criteria, priority/status, and links to relevant code, issues, traces, or dashboards.
- If task discovery starts locally in an editor or agent session, mirror the durable next step back into SaaS Maker before handoff.

### Using SaaS Maker
- Treat SaaS Maker as the system of record for project metadata, feedback, tasks, analytics, testimonials, changelog, and fleet visibility.
- Prefer API-first workflows through `fnd api`, the SDK, or widgets instead of one-off scripts when interacting with SaaS Maker features.
- Keep this agent file aligned with the project record when operating rules, integrations, or deployment conventions change.

### Free AI First
- Prefer free/local AI paths for routine development and analysis: the `free-ai` gateway, local models, provider free tiers, and cached context.
- Escalate to paid models only when complexity, correctness risk, or missing capability justifies the cost.
- Note any paid-AI use in the task or handoff when it materially affects cost, reproducibility, or future maintenance.

<!-- FLEET-GUIDANCE:END -->

## Active context
- Scoreboard live, ~7 default items seeded for primary user.
- Home is hero + Scoreboard + Today entry only. Other surfaces split to dedicated pages.
- Aggressive prune `9631951` removed 9 pages + 20 components + 11 hooks; `25625a2` restored Review/Memories/Rituals/Focus/IdentitySetter as separate pages.


<claude-mem-context>
# Memory Context

# [today-little-log] recent context, 2026-05-01 2:17pm GMT+5:30

Legend: 🎯session 🔴bugfix 🟣feature 🔄refactor ✅change 🔵discovery ⚖️decision 🚨security_alert 🔐security_note
Format: ID TIME TYPE TITLE
Fetch details: get_observations([IDs]) | Search: mem-search skill

Stats: 0 obs (0t read) | 0t work

### Apr 28, 2026
S210 today-little-log — home page restructuring into separate routes, API routing fix for CF Pages, infrastructure cleanup, and GitHub Actions deploy pipeline planning (Apr 28 at 6:50 PM)
**Investigated**: - Home page overload: 5 stacked surfaces (AM, PM, Today entry, Scoreboard, Past entries) all on `/`
    - Components deleted in prune commit `9631951` (IdentitySetter, FocusMode, Review page, WeeklyAutoReport) — checked deps via git show
    - FocusMode had `useQuickLogs`/`useDevLogs` dependencies (remove on restore)
    - IdentitySetter.tsx had duplicate content (file written twice, `head -123` truncation fixed it)
    - CF Pages API routing: `api/[resource].ts` is Vercel-style, never deployed; all dynamic routes returned HTML 200 (SPA fallback) instead of JSON
    - Only `functions/api/scoreboard-*` and `functions/api/auth/*` existed as actual CF Pages functions
    - All functions imported schema from `api/_lib/schema.ts` — duplicate of `src/db/schema.ts`
    - `vercel.json` + `scripts/bundle-api.mjs` were dead Vercel relics
    - PWA `registerType: "prompt"` requires user action; `autoUpdate` + `skipWaiting` + `clientsClaim` needed for immediate updates
    - CF Pages git auto-deploy vs wrangler CLI output differ — git integration has stripped functions before (likely due to old `vercel.json` framework detection)
    - Existing `saas-maker` repo has `foundry-ci.yml` reusable workflow — precedent for fleet-level GitHub Actions patterns

**Learned**: - CF Pages `[resource].ts` dynamic segment matches single `/api/<x>` paths; exact-match files win over dynamic
    - CF Pages git auto-deploy runs its own remote build — can produce different artifact than local `wrangler pages deploy` (functions stripped)
    - `vercel.json` presence was likely triggering wrong framework detection in CF's remote build
    - Two deploy pipelines (CF git + wrangler CLI) race on push; latest write wins — must disable one
    - Pre-push hooks gate code quality but cannot gate CF's remote build pipeline — orthogonal concerns
    - FocusMode was 571 lines originally (2 copies concatenated in file); rewritten clean at ~190 lines removing dead `useQuickLogs`/`useDevLogs` deps
    - `src/db/schema.ts` should be single source of truth; `api/_lib/schema.ts` was a manual duplicate requiring sync
    - PWA `registerType: "prompt"` blocks auto-update; `autoUpdate` + `skipWaiting` + `clientsClaim` activates new SW immediately on next navigation

**Completed**: - Created `/rituals` page (AmRitual + PmRitual, auto-orders by current hour)
    - Created `/focus` page (FocusMode component, pomodoro with tab-switch XP penalty)
    - Created `/memories` page (PastEntries + CalendarView + search)
    - Created `/review` page (7-day Scoreboard breakdown + recent AM/PM + weekly/monthly journal)
    - Restored `IdentitySetter` component from pre-prune commit, added to `/life` page
    - Restored `FocusMode` as slim rewrite (~190 lines, no dead deps)
    - Stripped home page (`/`) to hero + Scoreboard + Today entry only
    - Updated `App.tsx` with 4 new routes, `AppSidebar` with 4 new nav items (Rituals, Focus, Memories, Review), `BottomNav` updated for mobile
    - Created `functions/api/[resource].ts` — CF Pages dynamic router for profiles, daily-checkins, journal-entries, tasks, habits, habit-logs, user-stats
    - All API endpoints verified: HTTP 401 (auth-gated JSON) for all data routes, HTTP 200 for `/api/auth/get-session`
    - Consolidated to single schema: all `functions/` now import from `src/db/schema.ts`; deleted `api/_lib/schema.ts` duplicate
    - Deleted entire legacy `api/` directory (15 files), `vercel.json`, `scripts/bundle-api.mjs`
    - PWA updated: `registerType: autoUpdate`, `skipWaiting: true`, `clientsClaim: true`
    - Added `lint-staged` pre-commit hook for fast TS/TSX ESLint on staged files
    - `agents.md` fully rewritten to reflect current architecture (single schema, CF-only, 11 routes, deploy gotcha, secrets layout)
    - All changes built and deployed; all 10 routes return correct HTTP codes
    - Wrote PRD for reusable GitHub Actions CF Pages deploy workflow (fleet-level reusable in `saas-maker` repo)
    - Commits: `25625a2` (page split), `1a06cf1` (API port), `585adde` (infra cleanup)

**Next Steps**: - User needs to manually disconnect CF Pages git integration in Cloudflare dashboard (Pages → today-little-log → Settings → Builds & deployments → Disconnect from Git)
    - Implement reusable GH Actions workflow in `saas-maker/.github/workflows/cf-pages-deploy.yml`
    - Add caller workflow in `today-little-log/.github/workflows/deploy.yml`
    - Add `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` as GitHub repo secrets
    - Verify GH Actions deploy succeeds before disconnecting CF git integration
    - Roll GH Actions workflow to other fleet projects
</claude-mem-context>
