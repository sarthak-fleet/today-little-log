# Significant Hobbies (Today Little Log)

Daily journal, habit tracker, task manager, and schedule planner -- a calm personal productivity PWA.

## Tech Stack

- **Framework**: React 18 + Vite 5 (SPA, not Next.js)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 3 + shadcn/ui (default style, slate base, CSS variables)
- **Database**: Turso (libSQL/SQLite) via Drizzle ORM
- **Auth**: Better Auth with Google social provider (cookie-based sessions)
- **API**: Vercel Serverless Functions (`api/*.ts`) -- REST, each file is one endpoint
- **State**: React Query (TanStack) for server state, useState/custom hooks for local
- **Routing**: react-router-dom v6 (BrowserRouter)
- **PWA**: vite-plugin-pwa + Workbox (offline-ready, installable)
- **Analytics/Feedback**: SaaS Maker SDK
- **Other**: date-fns, recharts, lucide-react, hello-pangea/dnd, react-hook-form + zod, cmdk, next-themes
- **Deploy**: Vercel (push to `main` = prod, region `bom1`)

## Architecture

```
api/                      # Vercel serverless functions (Node 20, ESM)
  _lib/                   # Shared server code (NOT routes)
    auth.ts               # getUserId() -- fast cookie + fallback session lookup
    auth-instance.ts      # Better Auth instance config
    db.ts                 # Drizzle client (Turso)
    schema.ts             # Drizzle schema (duplicated from src/db/schema.ts)
  auth.ts, tasks.ts, habits.ts, habit-logs.ts, emotions.ts,
  journal-entries.ts, life-rules.ts, schedules.ts, profiles.ts, chat.ts
src/
  main.tsx                # Entry point
  App.tsx                 # Routes + providers
  db/schema.ts            # Drizzle schema (canonical copy)
  lib/api.ts              # apiFetch() wrapper
  lib/auth-client.ts      # Better Auth React client
  hooks/                  # One hook per domain (useAuth, useJournalEntries, useTasks, useHabits, etc.)
  components/             # Feature components + ui/ (shadcn)
  pages/                  # Index, Auth, Tasks, Habits, Schedule, Rules, Install, NotFound
scripts/
  bundle-api.mjs          # Pre-build: esbuild bundles each api/*.ts for Vercel
```

## Key Patterns

- **API routes**: Each `api/*.ts` exports default handler. Auth via `getUserId(req)`.
- **Schema duplication**: `api/_lib/schema.ts` and `src/db/schema.ts` must stay in sync.
- **Guest mode**: App works without auth using localStorage. Logged-in data syncs to Turso.
- **Hooks pattern**: Each domain has a custom hook handling API calls + local state.
- **Path alias**: `@/` maps to `src/`.

## Commands

```bash
pnpm dev         # Dev server (port 8080)
pnpm build       # Production build (bundles API + vite build)
pnpm preview     # Preview production build
pnpm lint        # ESLint
```

## Environment Variables

**Server-side:**
- `TURSO_DATABASE_URL` -- Turso database URL
- `TURSO_AUTH_TOKEN` -- Turso auth token
- `BETTER_AUTH_URL` -- App base URL
- `BETTER_AUTH_SECRET` -- Session signing secret
- `GOOGLE_CLIENT_ID` -- Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` -- Google OAuth client secret

**Client-side:**
- `VITE_BETTER_AUTH_URL` -- Same as BETTER_AUTH_URL
- `VITE_SAASMAKER_API_KEY` -- SaaS Maker API key

## Current State

**Done:** Journal (daily/weekly/monthly + search + calendar view), tasks (drag-and-drop, projects, estimates), habits (daily/weekly, history), emotion logging, life rules, schedule builder, AI chatbot (BYOK -- user provides Claude/OpenAI key), Google auth + guest mode, PWA, SaaS Maker integration, dark mode.

**Gaps:** No tests, schema duplicated in two places (fragile), README mentions Supabase (stale -- DB is Turso now), no UI for projects or time sessions (tables exist in schema but unused).
