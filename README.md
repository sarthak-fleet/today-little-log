# Today Little Log

![AI Generated](https://ai-percentage-pin.vercel.app/api/ai-percentage?value=100)
![AI PRs Welcome](https://ai-percentage-pin.vercel.app/api/ai-prs?welcome=yes)

A calm, focused daily journal, habit tracker, task manager, and schedule planner. Built with React, Vite, TypeScript, Better Auth, Turso, Drizzle, and a Cloudflare Pages Functions backend.

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

## Development

```sh
npm install
# configure the required env vars before starting the app
npm run dev
```

Required env vars:

- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`
- `BETTER_AUTH_URL`
- `BETTER_AUTH_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `VITE_BETTER_AUTH_URL`

## Build

```sh
npm run build
```

## Deploy

Deployed on Cloudflare Pages (project `today-little-log`). Push to `main` triggers a
production deploy via GitHub Actions (`wrangler pages deploy dist/`). The Pages
Functions backend lives in `functions/api/`.
