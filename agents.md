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

# [today-little-log] recent context, 2026-05-05 4:10pm GMT+5:30

Legend: 🎯session 🔴bugfix 🟣feature 🔄refactor ✅change 🔵discovery ⚖️decision 🚨security_alert 🔐security_note
Format: ID TIME TYPE TITLE
Fetch details: get_observations([IDs]) | Search: mem-search skill

Stats: 45 obs (15,964t read) | 363,850t work | 96% savings

### Apr 28, 2026
S210 today-little-log — home page restructuring into separate routes, API routing fix for CF Pages, infrastructure cleanup, and GitHub Actions deploy pipeline planning (Apr 28 at 6:50 PM)
### May 5, 2026
1063 2:09a ⚖️ Personal app redesign — cut to 3 core features only
1064 " 🔵 today-little-log codebase architecture — full structure mapped
1065 " ⚖️ today-little-log redesign plan — 5-step implementation approach
1066 2:10a ✅ Scoreboard schema extended — numeric monthly scoring columns added
1067 2:11a 🟣 useScoreboard hook rewritten — month-scoped numeric scoring
1068 " 🟣 Scoreboard API endpoints updated — month filtering, score_month/max_score/criteria fields, server-side score clamping
1069 2:13a 🟣 Scoreboard component fully rebuilt — numeric daily scoring with month calendar view
1070 " 🟣 Index page stripped to scoreboard-only; new Journal page created from Memories + old Index journal sections
1071 " 🟣 Navigation pruned to 3 items — routes collapsed, dead pages redirect to home
1072 2:14a 🔵 Review.tsx uses old useScoreboard API — dead code with stale item.category references
1073 " ✅ ScoreboardItem backward compat fields added; StreakBadge removed from Navbar
1074 " 🔵 TypeScript check: 1 error in dead Review.tsx; lint passes with 35 pre-existing warnings
1075 " 🔴 Review.tsx TypeScript error fixed — score kind added to getWeeklyPatterns types
1076 2:15a ✅ TypeScript + Vite build both pass after scoreboard redesign
1077 " ✅ Complete changeset for 3-feature redesign — 12 files modified, 2 new files
1078 3:49a ⚖️ Personal life tracking — points system architecture defined
1079 4:05a ⚖️ Daily habit scoring system — point allocations finalized
1080 4:12a 🔵 today-little-log scoreboard architecture — full stack mapped
1081 " 🟣 today-little-log — May 2026 habit scoring matrix implemented with min/ideal/max bounds
1082 " 🟣 Scoreboard API updated to persist and clamp min_score/ideal_score
1083 4:13a 🟣 useScoreboard hook extended — min_score, ideal_score, trackingStartDate, config-only item filter
1084 " 🔴 useScoreboard.ts — duplicate ternary branch syntax error in setLog after patch
1085 " 🔴 useScoreboard.ts — three correctness fixes for min/ideal score support
1086 4:14a 🟣 Scoreboard UI updated — ideal vs peak scoring, trackingStartDate, notCounted days
1087 " ✅ today-little-log — TypeScript and wrangler builds pass after scoreboard scoring overhaul
1088 " 🔵 today-little-log lint audit — 33 pre-existing warnings, 0 errors; build clean
1089 4:15a 🔵 Scoreboard verified live in browser — all 12 items render, ideal/peak split correct, trackingStartDate working
1090 " 🔵 playwright-cli fill fails with negative number arguments — parsed as CLI flags
1091 " 🔵 Scoreboard interactive test — above-ideal focus score and day note both persist and render correctly
1092 " 🔵 playwright-cli run-code does not expose `page` object — negative score testing blocked
1093 4:16a 🔵 Negative score input confirmed working — total drops correctly; playwright-cli `-- -10` workaround succeeds
1094 " ✅ Untitled
1095 4:17a 🔵 today-little-log deployment architecture — Turso + wrangler Pages, migration 0009 needs manual apply before deploy
1096 " 🔵 Turso CLI not authenticated — migration must run via drizzle-kit migrate using .env.local credentials
1097 4:18a 🔵 Wrangler authenticated via CLOUDFLARE_API_TOKEN — deploy ready
1098 4:19a 🔵 May 5 real-data score validated — 33/70 (47% ideal) with correct mixed positive/negative totaling
1099 " 🔵 playwright-cli localstorage-get returns "key=value" format — breaks JSON.parse merge attempt
1100 4:20a 🔵 Multi-day localStorage seed via direct node JSON generation — workaround for localstorage-get key=value format
1101 " 🔵 Calendar correctly suppresses scores for future-dated logs even when data exists in localStorage
1102 4:21a ✅ today-little-log deploy initiated — vite build succeeded, wrangler deploying with uncommitted changes warning
1103 4:29a 🟣 Daily score calculator — input-driven instead of manual calculation
1104 " 🔵 today-little-log scoreboard architecture — full stack mapped
1105 4:31a 🟣 today-little-log — input-driven auto-scoring added to Scoreboard
1106 " 🔄 Scoreboard.tsx — complete component rewrite, not incremental patch
1107 4:32a 🔵 today-little-log build + lint status — 0 errors, 33 pre-existing warnings

Access 364k tokens of past work via get_observations([IDs]) or mem-search skill.
</claude-mem-context>
