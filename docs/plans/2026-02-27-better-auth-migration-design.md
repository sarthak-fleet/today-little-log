# Supabase Auth to Better Auth Migration Design

**Goal:** Replace Supabase Auth with Better Auth (open-source, self-hosted) using the existing Turso DB for session storage, eliminating the Supabase dependency entirely.

**Motivation:** Supabase free tier pauses the entire project (including Auth) after 7 days of inactivity, breaking login for users.

## Architecture

Better Auth runs as a server-side auth library in Vercel API routes. It manages its own tables (`user`, `session`, `account`) in the existing Turso DB via Drizzle. The React client talks to `/api/auth/*` endpoints that Better Auth handles automatically.

**Data flow:**
1. User clicks "Continue with Google" -> `authClient.signIn.social({ provider: "google" })`
2. Better Auth handles OAuth redirect -> Google -> callback -> creates/finds user + session in Turso
3. Session cookie set automatically -> `authClient.useSession()` reads it on the client
4. API routes call `auth.api.getSession({ headers })` to verify session and get user ID

## Files Changed

| File | Action | What |
|------|--------|------|
| `src/db/schema.ts` | Modify | Add Better Auth tables (user, session, account) |
| `api/_lib/auth.ts` | Rewrite | Better Auth server instance + Drizzle adapter |
| `api/auth/[...all].ts` | Create | Catch-all route for Better Auth endpoints |
| `src/lib/auth-client.ts` | Create | Better Auth React client |
| `src/lib/api.ts` | Simplify | Remove Supabase token injection (cookies handle it) |
| `src/hooks/useAuth.ts` | Rewrite | Use `authClient.useSession()` instead of Supabase |
| `src/pages/Auth.tsx` | Rewrite | Use `authClient.signIn.social()` |
| `src/integrations/supabase/` | Delete | No longer needed |
| `api/*.ts` (all routes) | Modify | Update `getUserId()` calls (same function, new internals) |

## User ID Linking

- Better Auth creates new user IDs in its `user` table
- A one-time migration script updates `user_id` across all existing tables, matching by email from the Supabase profile to the Better Auth user
- After migration, all `user_id` foreign keys point to Better Auth user IDs

## What Gets Removed

- `@supabase/supabase-js` dependency
- `VITE_SUPABASE_*` env vars
- `src/integrations/supabase/` directory
- Supabase project dependency entirely

## New Env Vars

```
BETTER_AUTH_SECRET=<random-32-char-string>
BETTER_AUTH_URL=https://your-domain.vercel.app
GOOGLE_CLIENT_ID=<from-google-console>
GOOGLE_CLIENT_SECRET=<from-google-console>
```

## Key Benefit

Session is cookie-based. No token injection needed in `apiFetch`. API routes just read the session from request headers. Simpler than the current JWT approach.
