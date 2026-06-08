# Project Recommendation Context

Generated: 2026-06-06T21:14:19.637Z

This file is a CodeVetter Repo Unpacked-inspired audit written for Starboard recommendations. It is intentionally local, evidence-oriented, and safe to commit: it records product context, feature areas, stack inventory, and recommendation guidance without secrets or environment values.

## Project Identity

- Slug: `today-little-log`
- Registry description: Daily logging and micro-journaling application.
- Product grouping: `public-ready`
- Source path: `today-little-log`

## Product Context

Daily logging and micro-journaling application.

Today Little Log is a personal life PWA for daily scoring, journaling, rituals, habits, tasks, reflection, and a private no-zero-day scoreboard.

Today Little Log A personal life PWA for daily scoring, journaling, rituals, habits, tasks, and reflection. The app is intentionally quiet: it helps capture the day, maintain a no-zero-day scoreboard, and keep personal routines visible without becoming a heavy productivity system. Live app: <https://today-little-log.pages.dev What It Does - Daily scoreboard with user-defined check/output items and monthly scoring. - Journal entries and memory review surfaces. - AM/PM rituals, focus planning, habits, tasks, and Eisenhower views. - Memento mori life grid for long-range perspective. - Google sign-in through better-auth. - Cloudflare Pages Functions API backed by Turso/libSQL. - PWA install/upda

## Feature Map

- **Cloudflare and deploy**: Workers, Pages, edge runtime, queues, storage, and deploy automation. Keywords: cloudflare, worker, workers, pages, edge, deploy, wrangler, queue.
- **Database and storage**: SQL, document storage, migrations, cache, queues, vectors, and persistence. Keywords: database, db, sql, sqlite, postgres, turso, libsql, drizzle.
- **UI workflows**: Dashboards, tables, forms, component systems, charts, and user workflows. Keywords: ui, ux, dashboard, table, component, react, next, tailwind.
- **Testing and quality**: Unit tests, browser tests, evals, CI quality gates, and regression checks. Keywords: test, testing, quality, vitest, playwright, ci, eval, benchmark.
- **AI agents**: Agents, tool use, workflows, orchestration, RAG, evals, and model integration. Keywords: ai, agent, agents, llm, rag, embedding, eval, model.
- **Repo intelligence**: Repository understanding, metadata enrichment, code review, and evidence reports. Keywords: review, static, analysis, diff, history, evidence, verification.
- **Search and discovery**: Search, ranking, recommendations, feeds, semantic retrieval, and discovery UX. Keywords: search, discovery, recommend, ranking, semantic, feed, index, retrieval.

## Runtime Surfaces and Entrypoints

- `src/App.tsx`
- `src/main.tsx`
- `src/pages/About.tsx`
- `src/pages/Auth.tsx`
- `src/pages/Eisenhower.tsx`
- `src/pages/Focus.tsx`
- `src/pages/Habits.tsx`
- `src/pages/Index.tsx`
- `src/pages/Journal.tsx`
- `src/pages/Life.tsx`
- `src/pages/Memories.tsx`
- `src/pages/NotFound.tsx`
- `src/pages/Patterns.tsx`
- `src/pages/Privacy.tsx`
- `src/pages/Review.tsx`
- `src/pages/Rituals.tsx`
- `src/pages/Tasks.tsx`

## Current Stack

- Languages: `TypeScript`
- Frameworks/tools: `Cloudflare Workers`, `Drizzle`, `Playwright`, `Radix UI`, `React`, `Tailwind CSS`
- Config files:
- `drizzle.config.ts`
- `playwright.config.ts`
- `vite.config.ts`
- `wrangler.toml`

## OSS Already In Use

Direct dependencies:
- `@ai-sdk/openai-compatible`
- `@hello-pangea/dnd`
- `@libsql/client`
- `@radix-ui/react-alert-dialog`
- `@radix-ui/react-avatar`
- `@radix-ui/react-checkbox`
- `@radix-ui/react-collapsible`
- `@radix-ui/react-dialog`
- `@radix-ui/react-label`
- `@radix-ui/react-popover`
- `@radix-ui/react-scroll-area`
- `@radix-ui/react-select`
- `@radix-ui/react-separator`
- `@radix-ui/react-slot`
- `@radix-ui/react-tabs`
- `@radix-ui/react-toast`
- `@radix-ui/react-tooltip`
- `@saas-maker/ai`
- `@saas-maker/changelog-widget`
- `@saas-maker/feedback`
- `@saas-maker/sdk`
- `@saas-maker/testimonials`
- `@tanstack/react-query`
- `ai`
- `better-auth`
- `class-variance-authority`
- `clsx`
- `date-fns`
- `drizzle-orm`
- `lucide-react`
- `next-themes`
- `posthog-js`
- `react`
- `react-day-picker`
- `react-dom`
- `react-router-dom`
- `sonner`
- `tailwind-merge`
- `vite-plugin-pwa`
- `workbox-window`
- `zod`

Development dependencies:
- `@axe-core/playwright`
- `@eslint/js`
- `@playwright/test`
- `@saas-maker/eslint-config`
- `@saas-maker/prettier-config`
- `@saas-maker/test-config`
- `@saas-maker/tsconfig`
- `@tailwindcss/vite`
- `@types/node`
- `@types/react`
- `@types/react-dom`
- `@vitejs/plugin-react-swc`
- `drizzle-kit`
- `esbuild`
- `eslint`
- `eslint-plugin-react-hooks`
- `eslint-plugin-react-refresh`
- `globals`
- `husky`
- `knip`
- `lint-staged`
- `tailwindcss`
- `typescript`
- `typescript-eslint`
- `vite`
- `wrangler`

Package scripts:
- `build`
- `build:dev`
- `deploy`
- `dev`
- `lint`
- `prepare`
- `preview`
- `test`
- `typecheck`

## Testing and Quality Signals

- `playwright.config.ts`
- `tests/auth-button.spec.ts`
- `tests/interactive.spec.ts`
- `tests/journal-flow.spec.ts`
- `tests/mobile.spec.ts`
- `tests/prod-auth.spec.ts`
- `tests/smoke.spec.ts`
- `tests/tll-remote.spec.ts`

## Recommendation Guidance

Good matches:
- Repos that strengthen cloudflare and deploy without replacing already-installed libraries.
- Repos that strengthen database and storage without replacing already-installed libraries.
- Repos that strengthen ui workflows without replacing already-installed libraries.
- Repos that strengthen testing and quality without replacing already-installed libraries.
- Repos that strengthen ai agents without replacing already-installed libraries.
- Repos that strengthen repo intelligence without replacing already-installed libraries.
- Repos that strengthen search and discovery without replacing already-installed libraries.
- Tools with concrete support for pages, src, radix-ui, cloudflare, daily, functions, google, pwa.
- Implementation repos, SDKs, CLIs, testing utilities, adapters, and focused libraries are higher value than generic awesome lists.

Avoid recommending:
- Do not recommend packages already listed under direct or development dependencies unless the task is migration research.
- Do not recommend broad framework replacements unless the project context explicitly calls for a rewrite.
- Downrank curated lists, archived repos, stale demos, and generic UI kits that do not map to the feature catalog.

## Evidence Read

Primary docs and handoff files:
- `PROJECT_STATUS.md`
- `README.md`
- `agents.md`
- `docs/README.md`

Package manifests:
- `package.json`

Inventory notes:
- Files scanned: 195
- This pass uses deterministic repo inventory plus local documentation/source-path evidence. It does not claim a full manual line-by-line review of every source file.

## Confidence

Confidence: **high**

Why:
- PROJECT_STATUS.md present
- README.md present
- 17 entrypoint/runtime files identified
- package dependencies inventoried
- 8 test/quality files identified

Refresh command:

```bash
cd /Users/sarthak/Desktop/fleet/starboard
pnpm fleet:audit-recommendation-context
pnpm fleet:extract-projects
```
