# Supabase Auth to Better Auth Migration PRD

## Summary

Replace Supabase Auth with Better Auth while keeping the existing Turso-backed data model. The target state removes the external auth dependency, preserves the Google sign-in flow, and keeps all user-owned data reachable through the same app routes and API contract.

## Problem

Supabase free-tier inactivity pauses can take the app's login flow offline even when the rest of the product is healthy. That failure mode is too brittle for a personal logging app where sign-in is part of the daily habit loop.

## Goals

- Remove the Supabase auth dependency from runtime code.
- Keep Google sign-in as the only supported login path.
- Store sessions in Turso with cookie-based auth checks.
- Preserve existing user data by linking old records to the new Better Auth user IDs.
- Keep the migration reversible until the old auth layer is fully retired.

## Non-Goals

- No new auth providers.
- No redesign of the logged-out or logged-in UI beyond auth flow wiring.
- No schema changes outside the auth and user-linking tables needed for the migration.
- No production cutover without a verified local and staging-equivalent smoke pass.

## Target Architecture

Better Auth runs server-side in Pages Functions and owns the auth session lifecycle.

**Request flow**
1. User clicks "Continue with Google".
2. The client calls `authClient.signIn.social({ provider: "google" })`.
3. Better Auth handles the OAuth redirect and callback.
4. Better Auth creates or reuses the user record and sets a secure session cookie.
5. Client session state comes from `authClient.useSession()`.
6. API routes call the server auth helper to resolve the current user ID.

**Data model**
- Better Auth owns `user`, `session`, and `account` records.
- Existing product tables continue to reference `user_id`.
- A one-time linking migration maps legacy auth identities to the new Better Auth user IDs by email.

## Implementation Scope

| File | Change |
|------|--------|
| `src/db/schema.ts` | Add Better Auth tables and relation fields |
| `functions/api/_helpers.ts` or equivalent auth helper | Centralize request/session lookup |
| `functions/api/auth/[[all]].ts` | Add Better Auth catch-all route |
| `src/lib/auth-client.ts` | Create the Better Auth client wrapper |
| `src/lib/api.ts` | Remove bearer-token injection and rely on cookies |
| `src/hooks/useAuth.ts` | Read session from Better Auth |
| `src/pages/Auth.tsx` | Switch the sign-in button to Better Auth |
| Existing data routes | Keep `requireUserId` behavior but source it from Better Auth |
| Legacy Supabase integration files | Remove after the migration is verified |

## Migration Plan

1. Add the Better Auth schema and server route alongside the existing auth implementation.
2. Wire the client to Better Auth while keeping the current data API stable.
3. Run a one-time user-linking migration that maps legacy identities by email.
4. Verify that all user-scoped data still resolves under the new user IDs.
5. Remove Supabase-specific code once the new flow passes smoke checks.

## Validation

The migration is done when:

- Google sign-in works on localhost and the deployed Pages domain.
- Sessions persist across refreshes and new browser tabs.
- Authenticated API requests succeed without token injection.
- Existing users still see their historical data after the user-ID mapping step.
- The repo's typecheck, lint, and build checks pass after the cutover.

## Risks

- Email collisions or missing legacy profile data could break the user-ID mapping step.
- Session cookie configuration mistakes could cause silent auth failures.
- Removing the old auth path too early could strand existing users.

## Rollout Notes

- Keep the old auth wiring available until the new flow is validated.
- Make the linking migration explicit and repeatable before deleting legacy code.
- Prefer one small deploy after verification instead of mixing auth migration with unrelated UI work.
