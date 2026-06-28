# new-things — study queue

Short stubs for non-standard tech in this repo. 3–5 lines each. Fill `Why here:`
yourself after learning; never invent rationale.

## PWA with Workbox (autoUpdate, skipWaiting, clientsClaim)
- What: PWA configuration that activates new service worker bundles immediately on next navigation
- Why here: TBD
- Gotcha (from code): `vite.config.ts:87-88` — `skipWaiting: true, clientsClaim: true` together means new SW activates immediately without waiting for all tabs to close
- Source: https://developer.chrome.com/docs/workbox/

## CF Pages Functions dynamic routing ([resource].ts)
- What: Single file matches `/api/<any-single-segment>` — exact-match files win on collision
- Why here: TBD
- Gotcha (from code): `functions/api/[resource].ts:422-454` — switch statement on `resource` handles 7 endpoints; `scoreboard-items.ts` exact-match wins over `[resource].ts` wildcard
- Source: https://developers.cloudflare.com/pages/functions/routing/

## Single schema shared between Drizzle and CF Pages Functions
- What: `src/db/schema.ts` is imported by both Drizzle migrations and CF Pages Functions — no duplication
- Why here: TBD
- Gotcha (from code): both `drizzle-kit` and `functions/api/_helpers.ts` import from the same schema file — single source of truth for types and columns
- Source: https://orm.drizzle.team/

## Better-auth on Pages Functions with Turso sessions
- What: Running better-auth on Cloudflare Pages Functions with session storage in Turso — builds auth instance per request
- Why here: TBD
- Gotcha (from code): `functions/api/auth/[[all]].ts` — catch-all handler for `/api/auth/*` builds a fresh better-auth instance per request from `context.env`
- Source: https://www.better-auth.com/

## Memento mori life grid math
- What: Visualizing life as a grid of weeks with deterministic daily quote selection
- Why here: TBD
- Gotcha (from code): `src/lib/mementoMori.ts:46-49` — quote selection is `key = YYYYMMDD mod length` — deterministic per day, no randomness, same quote for everyone on the same day
- Source: https://waitbutwhy.com/2014/05/life-weeks.html

## Lightning CSS transformer in Vite
- What: Using Rust-based Lightning CSS instead of PostCSS for faster builds and smaller output
- Why here: TBD
- Gotcha (from code): `vite.config.ts:131-139` — `css.transformer: 'lightningcss'` with `drafts: { customMedia: true }` — matches autoprefixer target that Vite's default PostCSS would have applied
- Source: https://lightningcss.dev/

## CF Pages deploy gotcha — Git auto-deploy strips functions
- What: Cloudflare Pages Git integration can strip Pages Functions from the build — manual wrangler deploy is the safe path
- Why here: TBD
- Gotcha (from code): `AGENTS.md` notes "CF Pages git auto-deploy has stripped functions in the past — always deploy via `pnpm run deploy` (manual wrangler)"
- Source: https://developers.cloudflare.com/pages/functions/deployments/
