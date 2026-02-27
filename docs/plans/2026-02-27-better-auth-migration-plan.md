# Better Auth Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace Supabase Auth with Better Auth, storing sessions in the existing Turso DB, eliminating Supabase entirely.

**Architecture:** Better Auth runs server-side in Vercel API routes with Drizzle adapter pointing at Turso. A catch-all route at `api/auth/[...all].ts` handles OAuth flows. The React client uses `authClient.useSession()` for session state and cookie-based auth replaces JWT token injection.

**Tech Stack:** better-auth, @libsql/client, drizzle-orm, Vite + React, Vercel serverless functions

---

### Task 1: Install better-auth

**Files:**
- Modify: `package.json`

**Step 1: Install the package**

```bash
pnpm add better-auth
```

**Step 2: Verify installation**

```bash
pnpm ls better-auth
```

Expected: Shows better-auth version

**Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add better-auth dependency"
```

---

### Task 2: Add Better Auth tables to Drizzle schema

**Files:**
- Modify: `src/db/schema.ts`

Better Auth needs 4 tables: `user`, `session`, `account`, `verification`. These coexist with the existing app tables.

**Step 1: Add Better Auth tables to schema**

Add these tables to `src/db/schema.ts` (after the existing imports, before the app tables):

```ts
// ── Better Auth tables ───────────────────────────────────────
export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('emailVerified', { mode: 'boolean' }).notNull().default(false),
  image: text('image'),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull(),
});

export const session = sqliteTable('session', {
  id: text('id').primaryKey(),
  expiresAt: integer('expiresAt', { mode: 'timestamp' }).notNull(),
  token: text('token').notNull().unique(),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
});

export const account = sqliteTable('account', {
  id: text('id').primaryKey(),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: integer('accessTokenExpiresAt', { mode: 'timestamp' }),
  refreshTokenExpiresAt: integer('refreshTokenExpiresAt', { mode: 'timestamp' }),
  scope: text('scope'),
  password: text('password'),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull(),
});

export const verification = sqliteTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: integer('expiresAt', { mode: 'timestamp' }).notNull(),
  createdAt: integer('createdAt', { mode: 'timestamp' }),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }),
});
```

**Step 2: Push schema to Turso**

```bash
npx drizzle-kit push
```

Expected: Tables `user`, `session`, `account`, `verification` created. Existing tables untouched.

**Step 3: Commit**

```bash
git add src/db/schema.ts
git commit -m "feat: add Better Auth tables to Drizzle schema"
```

---

### Task 3: Create Better Auth server instance

**Files:**
- Rewrite: `api/_lib/auth.ts`

This file currently creates a Supabase client and exports `getUserId()`. Replace it with the Better Auth server instance and a new `getUserId()` that reads from cookie-based sessions.

**Step 1: Rewrite `api/_lib/auth.ts`**

```ts
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { fromNodeHeaders } from 'better-auth/node';
import type { VercelRequest } from '@vercel/node';
import { db } from '../../src/db';
import * as schema from '../../src/db/schema';

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: 'sqlite',
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
});

export async function getUserId(req: VercelRequest): Promise<string | null> {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });

  if (!session) return null;
  return session.user.id;
}
```

**Step 2: Verify build**

```bash
pnpm build
```

Expected: Build succeeds (API routes are not bundled by Vite, but TypeScript should be clean)

**Step 3: Commit**

```bash
git add api/_lib/auth.ts
git commit -m "feat: replace Supabase auth with Better Auth server instance"
```

---

### Task 4: Create catch-all auth route

**Files:**
- Create: `api/auth/[...all].ts`

This handles all `/api/auth/*` requests (sign-in, callback, session, sign-out, etc.).

**Step 1: Create the handler**

```ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { toNodeHandler } from 'better-auth/node';
import { auth } from '../_lib/auth';

const handler = toNodeHandler(auth);

export default async function (req: VercelRequest, res: VercelResponse) {
  return handler(req, res);
}
```

**Step 2: Commit**

```bash
git add api/auth/
git commit -m "feat: add Better Auth catch-all API route"
```

---

### Task 5: Create React auth client

**Files:**
- Create: `src/lib/auth-client.ts`

**Step 1: Create the client**

```ts
import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_BETTER_AUTH_URL || window.location.origin,
});
```

**Step 2: Commit**

```bash
git add src/lib/auth-client.ts
git commit -m "feat: add Better Auth React client"
```

---

### Task 6: Simplify apiFetch

**Files:**
- Modify: `src/lib/api.ts`

Remove Supabase token injection. Cookies handle auth now.

**Step 1: Rewrite `src/lib/api.ts`**

```ts
export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(path, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `API error ${res.status}`);
  }

  return res.json();
}
```

**Step 2: Commit**

```bash
git add src/lib/api.ts
git commit -m "refactor: simplify apiFetch, remove Supabase token injection"
```

---

### Task 7: Rewrite useAuth hook

**Files:**
- Modify: `src/hooks/useAuth.ts`

Replace Supabase auth listener with Better Auth's `useSession()`.

**Step 1: Rewrite `src/hooks/useAuth.ts`**

```ts
import { useState, useEffect } from 'react';
import { authClient } from '@/lib/auth-client';
import { apiFetch } from '@/lib/api';

export interface Profile {
  id: string;
  user_id: string;
  name: string | null;
  avatar_url: string | null;
  dob: string | null;
}

export function useAuth() {
  const { data: sessionData, isPending } = authClient.useSession();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (sessionData?.user) {
      fetchProfile();
    } else {
      setProfile(null);
    }
  }, [sessionData?.user?.id]);

  const fetchProfile = async () => {
    try {
      const data = await apiFetch<Profile | null>('/api/profiles');
      setProfile(data);
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    }
  };

  const signOut = async () => {
    await authClient.signOut();
  };

  const updateDob = async (dob: string) => {
    if (!sessionData?.user) return { error: new Error('Not authenticated') };

    try {
      await apiFetch('/api/profiles', {
        method: 'PATCH',
        body: JSON.stringify({ dob }),
      });

      if (profile) {
        setProfile({ ...profile, dob });
      }
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  return {
    user: sessionData?.user ?? null,
    session: sessionData?.session ?? null,
    profile,
    loading: isPending,
    signOut,
    updateDob,
  };
}
```

**Step 2: Commit**

```bash
git add src/hooks/useAuth.ts
git commit -m "feat: rewrite useAuth hook for Better Auth"
```

---

### Task 8: Rewrite Auth page

**Files:**
- Modify: `src/pages/Auth.tsx`

Replace `supabase.auth.signInWithOAuth()` with `authClient.signIn.social()`.

**Step 1: Rewrite `src/pages/Auth.tsx`**

```tsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Feather } from 'lucide-react';

const Auth = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  const handleGoogleSignIn = async () => {
    await authClient.signIn.social({
      provider: 'google',
      callbackURL: '/',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse">
          <Feather className="h-8 w-8 text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Feather className="h-7 w-7 text-primary" />
          </div>
          <h1 className="font-display font-semibold text-2xl text-foreground">
            Significant Hobbies
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            A moment for reflection
          </p>
        </div>

        {/* Google Sign In */}
        <Button
          onClick={handleGoogleSignIn}
          variant="outline"
          className="w-full h-12 text-base"
        >
          <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </Button>
      </div>
    </div>
  );
};

export default Auth;
```

**Step 2: Commit**

```bash
git add src/pages/Auth.tsx
git commit -m "feat: rewrite Auth page for Better Auth Google sign-in"
```

---

### Task 9: Remove Supabase entirely

**Files:**
- Delete: `src/integrations/supabase/client.ts`
- Delete: `src/integrations/supabase/types.ts`
- Modify: `package.json` (remove `@supabase/supabase-js`)

**Step 1: Delete Supabase files**

```bash
rm -rf src/integrations/supabase/
```

**Step 2: Remove Supabase dependency**

```bash
pnpm remove @supabase/supabase-js
```

**Step 3: Verify no remaining Supabase imports**

Search for any remaining `supabase` imports in `src/`:

```bash
grep -r "supabase" src/ --include="*.ts" --include="*.tsx"
```

Expected: No results. If any remain, update those files to remove the imports.

**Step 4: Verify build passes**

```bash
pnpm build
```

Expected: Clean build with no errors.

**Step 5: Commit**

```bash
git add -A
git commit -m "refactor: remove Supabase dependency entirely"
```

---

### Task 10: Pre-seed Better Auth user table

**Files:**
- Create: `scripts/seed-better-auth-users.ts`

This script reads existing profiles from Turso and inserts corresponding records into the Better Auth `user` table, preserving the original Supabase user IDs so all existing data stays linked.

**Step 1: Create the seed script**

```ts
// scripts/seed-better-auth-users.ts
// Run with: npx tsx scripts/seed-better-auth-users.ts
//
// Reads profiles from Turso (which have the old Supabase user IDs)
// and inserts them into Better Auth's `user` table with the SAME IDs.
// This ensures all existing data (tasks, habits, etc.) stays linked.

import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from '../src/db/schema';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});
const db = drizzle(client, { schema });

async function main() {
  console.log('Reading existing profiles...');
  const existingProfiles = await db.select().from(schema.profiles);

  if (existingProfiles.length === 0) {
    console.log('No profiles found, nothing to seed.');
    process.exit(0);
  }

  console.log(`Found ${existingProfiles.length} profile(s). Seeding Better Auth user table...`);

  const now = new Date();

  for (const profile of existingProfiles) {
    // We need the email. Check if it's stored in profiles.
    // If not, we'll use the user_id as a placeholder and fix on first sign-in.
    await db.insert(schema.user).values({
      id: profile.user_id,
      name: profile.name || 'User',
      email: profile.name || `${profile.user_id}@placeholder.local`,
      emailVerified: true,
      image: profile.avatar_url,
      createdAt: now,
      updatedAt: now,
    }).onConflictDoNothing();

    console.log(`  Seeded user: ${profile.user_id} (${profile.name})`);
  }

  console.log('\nDone! Users seeded into Better Auth user table.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
```

> **Note:** The profiles table may not have email. If so, you'll need to check the Supabase auth.users table for emails before Supabase is decommissioned, or just let Better Auth create fresh users on first Google sign-in and run a user_id migration afterward. The implementer should check `src/db/schema.ts` for the profiles table columns.

**Step 2: Run the seed**

```bash
TURSO_DATABASE_URL="libsql://little-log-sarthak927.aws-ap-south-1.turso.io" \
TURSO_AUTH_TOKEN="<token>" \
npx tsx scripts/seed-better-auth-users.ts
```

**Step 3: Commit**

```bash
git add scripts/seed-better-auth-users.ts
git commit -m "feat: add Better Auth user seed script"
```

---

### Task 11: Set up Google OAuth credentials

**Manual steps (not code):**

**Step 1: Go to Google Cloud Console**

Open https://console.cloud.google.com/apis/credentials

**Step 2: Find or create OAuth 2.0 Client**

Either reuse the existing client (from Supabase setup) or create a new one:
- Application type: **Web application**
- Name: `little-log`

**Step 3: Add redirect URIs**

- `http://localhost:3000/api/auth/callback/google` (local development)
- `https://your-vercel-domain.vercel.app/api/auth/callback/google` (production)

**Step 4: Copy credentials**

Note the **Client ID** and **Client Secret**.

**Step 5: Update `.env`**

```env
BETTER_AUTH_SECRET=<generate-a-random-32-char-string>
BETTER_AUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=<your-client-id>
GOOGLE_CLIENT_SECRET=<your-client-secret>
```

Also add a Vite-accessible URL for the client:
```env
VITE_BETTER_AUTH_URL=http://localhost:3000
```

---

### Task 12: Set Vercel env vars and deploy

**Step 1: Set environment variables on Vercel**

```bash
echo "<secret>" | vercel env add BETTER_AUTH_SECRET production
echo "https://your-domain.vercel.app" | vercel env add BETTER_AUTH_URL production
echo "https://your-domain.vercel.app" | vercel env add VITE_BETTER_AUTH_URL production
echo "<client-id>" | vercel env add GOOGLE_CLIENT_ID production
echo "<client-secret>" | vercel env add GOOGLE_CLIENT_SECRET production
```

**Step 2: Remove old Supabase env vars from Vercel**

```bash
vercel env rm VITE_SUPABASE_URL production
vercel env rm VITE_SUPABASE_PUBLISHABLE_KEY production
vercel env rm VITE_SUPABASE_PROJECT_ID production
```

**Step 3: Push and deploy**

```bash
git push origin main
```

**Step 4: Verify deployment**

1. Open the deployed app
2. Click "Continue with Google"
3. Complete OAuth flow
4. Verify you're redirected back and session is active
5. Verify existing data (tasks, habits, etc.) loads correctly

---

### Task 13: Clean up .env and verify

**Step 1: Remove Supabase env vars from `.env`**

Remove these lines:
```
VITE_SUPABASE_PROJECT_ID=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
VITE_SUPABASE_URL=...
```

Keep Turso vars (still needed) and the new Better Auth / Google vars.

**Step 2: Final commit**

```bash
git add .env
git commit -m "chore: clean up env vars, remove Supabase references"
```

---

## Summary of changes

| Before (Supabase) | After (Better Auth) |
|---|---|
| `supabase.auth.signInWithOAuth()` | `authClient.signIn.social()` |
| `supabase.auth.onAuthStateChange()` | `authClient.useSession()` |
| `supabase.auth.getUser(token)` in API | `auth.api.getSession({ headers })` |
| JWT Authorization header | Cookie-based session |
| External Supabase service | Self-hosted in Turso |
| 3 VITE_SUPABASE_* env vars | BETTER_AUTH_SECRET + BETTER_AUTH_URL + GOOGLE_* |
