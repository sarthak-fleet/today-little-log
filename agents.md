# agents.md — today-little-log

## Purpose
Personal life-management PWA: daily journaling, habit tracking, task management, emotion logging, schedule adherence, and mortality-awareness tools — all in one offline-capable app.

## Stack
- Framework: React 19 SPA (React Router v7), Vite 8
- Language: TypeScript
- Styling: Tailwind CSS v4 + Radix UI primitives (shadcn/ui)
- DB: Turso (libSQL via `@libsql/client`) + Drizzle ORM — migrations in `drizzle/`
- Auth: Better Auth (`better-auth` + `@better-auth/drizzle-adapter`) — replaces previous Supabase/NextAuth setup
- Testing: Playwright (e2e in `tests/`) — no unit test runner configured
- Deploy: Vercel (frontend `vite build → dist/`; serverless functions in `api/`)
- Package manager: pnpm

## Repo structure
```
today-little-log/
├── src/
│   ├── App.tsx             # React Router routes
│   ├── pages/              # Route-level components (Index, Tasks, Habits, Life, etc.)
│   ├── components/         # 40+ feature components
│   ├── hooks/              # One hook per domain (useHabits, useTasks, useEmotions, etc.)
│   ├── lib/
│   │   ├── api.ts          # apiFetch() wrapper around all /api/* endpoints
│   │   ├── auth-client.ts  # Better Auth React client
│   │   ├── mementoMori.ts  # Life weeks / mortality math
│   │   ├── xp.ts           # XP / gamification
│   │   ├── psiScore.ts     # Personal score computation
│   │   └── protocol.ts     # AM/PM ritual definitions
│   └── db/schema.ts        # Drizzle schema (client-side reference copy)
├── api/                    # Vercel serverless functions
│   ├── _lib/
│   │   ├── auth.ts         # getUserId() — cookie + session lookup
│   │   ├── auth-instance.ts # Better Auth server instance config
│   │   ├── db.ts           # Drizzle client (Turso)
│   │   └── schema.ts       # Drizzle schema (must stay in sync with src/db/schema.ts)
│   ├── [resource].ts       # Generic CRUD router
│   ├── auth.ts             # Better Auth handler
│   ├── chat.ts             # AI chatbot endpoint
│   └── <entity>.ts         # Per-entity endpoints (habits, tasks, emotions, etc.)
├── drizzle/migrations/     # SQL migration files
├── drizzle.config.ts       # Turso dialect
├── scripts/
│   └── bundle-api.mjs      # esbuild bundler for api/ → Vercel deployment
├── vendor/saas-maker-ai/   # Vendored @saas-maker/ai package (file: dep)
└── vite.config.ts          # PWA config, port 8080
```

## Key commands
```bash
pnpm dev        # vite (localhost:8080) — frontend only
pnpm build      # vite build → dist/ (api/ bundled separately for Vercel)
pnpm preview    # vite preview
pnpm test:e2e   # playwright test
pnpm lint       # eslint
```

## Architecture notes
- **PWA**: `vite-plugin-pwa` + Workbox. Offline caching, manifest, install prompts. Theme color `#e86a1f`, standalone display.
- **Auth migration history**: Supabase → NextAuth → Better Auth. Current auth: `better-auth` with Google provider. `api/_lib/auth-instance.ts` holds the server instance.
- **Schema duplication**: `api/_lib/schema.ts` and `src/db/schema.ts` must stay in sync — any schema change needs updating in both places.
- **API layer**: Vercel serverless functions in `api/`. `scripts/bundle-api.mjs` bundles them with esbuild for deployment. Generic CRUD via `api/[resource].ts`; complex entities get their own files.
- **`@saas-maker/ai` vendored**: stored as `file:vendor/saas-maker-ai` — a local copy of the AI package from the saas-maker sibling project rather than an npm registry package.
- **TanStack Query**: all data fetching uses `@tanstack/react-query`. Hooks in `src/hooks/` each manage one resource type.
- **Gamification**: XP system, mana points, streak badges, PSI score, Eisenhower matrix, life weeks grid (memento mori visualization).
- husky pre-push hook configured.

## Dep health (knip findings — 2026-04-24)
Knip flagged 25 unused dependencies and 59 unused files. Key findings:
- **All `api/` files** reported as unused by knip — knip does not understand Vercel serverless conventions; these ARE used.
- **`vendor/saas-maker-ai/dist/`** flagged — these are dist artifacts, expected.
- **Genuinely unused Radix UI deps** (candidates for removal): `@radix-ui/react-accordion`, `@radix-ui/react-aspect-ratio`, `@radix-ui/react-context-menu`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-hover-card`, `@radix-ui/react-menubar`, `@radix-ui/react-navigation-menu`, `@radix-ui/react-progress`, `@radix-ui/react-radio-group`, `@radix-ui/react-slider`, `@radix-ui/react-switch`, `@radix-ui/react-toggle`, `@radix-ui/react-toggle-group`.
- **Other unused deps**: `cmdk`, `embla-carousel-react`, `@fontsource/playfair-display`, `@fontsource/source-sans-pro`, `@hookform/resolvers`, `@better-auth/drizzle-adapter` (already built-in to better-auth).
- **Unused shadcn/ui components** in `src/components/ui/`: accordion, alert, aspect-ratio, breadcrumb, carousel, chart, command, context-menu, drawer, dropdown-menu, form, hover-card, input-otp, menubar, navigation-menu, pagination, progress, radio-group, resizable, slider, switch, table, toggle-group, toggle.

## Active context
