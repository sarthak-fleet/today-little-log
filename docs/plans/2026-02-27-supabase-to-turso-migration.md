# Supabase DB to Turso Migration Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move all database operations from Supabase PostgREST to Turso via Vercel API routes + Drizzle ORM, keeping Supabase Auth.

**Architecture:** Frontend hooks call Vercel API routes instead of Supabase client directly. API routes verify the Supabase JWT, extract `user_id`, and query Turso via Drizzle. Auth (login, session, signOut) stays on Supabase.

**Tech Stack:** Drizzle ORM, `@libsql/client` driver, Vercel serverless functions, Turso.

**User ID Linkage:** Supabase Auth JWT `sub` claim = `user_id` in all Turso tables. The migration script copies `user_id` values verbatim. API routes extract `user_id` from the verified JWT and use it as the WHERE filter on every query. Client-supplied `user_id` is never trusted.

**SQLite differences from Postgres:**
- No native UUID type -- use `text` with app-generated UUIDs
- No `jsonb` -- use `text` storing JSON strings
- No `timestamp` -- use `text` storing ISO 8601 strings
- `ON CONFLICT` works (SQLite supports UPSERT)

---

## Task 1: Install dependencies and configure Drizzle for Turso

**Files:**
- Modify: `package.json`
- Create: `src/db/schema.ts`
- Create: `src/db/index.ts`
- Create: `drizzle.config.ts`
- Modify: `.env` (add `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`)

**Step 1: Install packages**

```bash
pnpm add drizzle-orm @libsql/client
pnpm add -D drizzle-kit
```

**Step 2: Add Turso env vars to `.env`**

```
TURSO_DATABASE_URL="libsql://your-db-name.turso.io"
TURSO_AUTH_TOKEN="your-auth-token"
```

User creates a Turso database first:
```bash
turso db create little-log
turso db tokens create little-log
```

**Step 3: Create Drizzle schema (`src/db/schema.ts`)**

```ts
import { sqliteTable, text, integer, real, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

const id = () => text('id').primaryKey().$defaultFn(() => crypto.randomUUID());
const userId = () => text('user_id').notNull();
const createdAt = () => text('created_at').notNull().$defaultFn(() => new Date().toISOString());
const updatedAt = () => text('updated_at').notNull().$defaultFn(() => new Date().toISOString());

export const profiles = sqliteTable('profiles', {
  id: id(),
  user_id: userId(),
  name: text('name'),
  avatar_url: text('avatar_url'),
  dob: text('dob'),
  created_at: createdAt(),
  updated_at: updatedAt(),
}, (t) => [uniqueIndex('profiles_user_id_idx').on(t.user_id)]);

export const projects = sqliteTable('projects', {
  id: id(),
  user_id: userId(),
  title: text('title').notNull(),
  description: text('description'),
  color: text('color'),
  created_at: createdAt(),
  updated_at: updatedAt(),
});

export const tasks = sqliteTable('tasks', {
  id: id(),
  user_id: userId(),
  title: text('title').notNull(),
  notes: text('notes'),
  estimate_minutes: integer('estimate_minutes'),
  status: text('status').notNull().default('todo'),
  sort_order: integer('sort_order').notNull().default(0),
  project_id: text('project_id').references(() => projects.id),
  created_at: createdAt(),
  updated_at: updatedAt(),
});

export const habits = sqliteTable('habits', {
  id: id(),
  user_id: userId(),
  title: text('title').notNull(),
  target_type: text('target_type').notNull().default('target'),
  track_type: text('track_type').notNull().default('count'),
  frequency: text('frequency').notNull().default('daily'),
  target_value: real('target_value').notNull().default(1),
  project_id: text('project_id').references(() => projects.id),
  created_at: createdAt(),
  updated_at: updatedAt(),
});

export const habitLogs = sqliteTable('habit_logs', {
  id: id(),
  user_id: userId(),
  habit_id: text('habit_id').notNull().references(() => habits.id, { onDelete: 'cascade' }),
  date: text('date').notNull(),
  value: real('value').notNull().default(0),
  created_at: createdAt(),
  updated_at: updatedAt(),
}, (t) => [uniqueIndex('habit_logs_habit_date_idx').on(t.habit_id, t.date)]);

export const emotions = sqliteTable('emotions', {
  id: id(),
  user_id: userId(),
  emotion: text('emotion').notNull(),
  comment: text('comment'),
  logged_at: text('logged_at').notNull().$defaultFn(() => new Date().toISOString()),
  created_at: createdAt(),
});

export const journalEntries = sqliteTable('journal_entries', {
  id: id(),
  user_id: userId(),
  date: text('date').notNull(),
  content: text('content').notNull().default(''),
  entry_type: text('entry_type').notNull().default('daily'),
  created_at: createdAt(),
  updated_at: updatedAt(),
});

export const lifeRules = sqliteTable('life_rules', {
  id: id(),
  user_id: userId(),
  content: text('content').notNull(),
  position: integer('position').notNull().default(0),
  created_at: createdAt(),
  updated_at: updatedAt(),
});

export const schedules = sqliteTable('schedules', {
  id: id(),
  user_id: userId(),
  blocks: text('blocks', { mode: 'json' }).notNull().default('[]'),
  created_at: createdAt(),
  updated_at: updatedAt(),
}, (t) => [uniqueIndex('schedules_user_id_idx').on(t.user_id)]);

export const timeSessions = sqliteTable('time_sessions', {
  id: id(),
  user_id: userId(),
  reference_id: text('reference_id').notNull(),
  reference_type: text('reference_type').notNull(),
  started_at: text('started_at').notNull(),
  ended_at: text('ended_at'),
  duration_seconds: integer('duration_seconds').notNull().default(0),
  notes: text('notes'),
  project_id: text('project_id').references(() => projects.id),
  created_at: createdAt(),
});
```

**Step 4: Create DB connection (`src/db/index.ts`)**

```ts
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

export const db = drizzle(client, { schema });
```

**Step 5: Create Drizzle config (`drizzle.config.ts`)**

```ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'turso',
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  },
});
```

**Step 6: Push schema to Turso**

```bash
pnpm drizzle-kit push
```

**Step 7: Commit**

```bash
git add src/db/ drizzle.config.ts package.json pnpm-lock.yaml
git commit -m "feat: add Drizzle ORM schema for Turso"
```

---

## Task 2: Create auth verification middleware

**Files:**
- Create: `api/_lib/auth.ts`

**Step 1: Create the auth helper**

Verifies the Supabase JWT and extracts the `user_id`. Uses the Supabase client server-side to validate the token -- ensures user IDs are always authentic Supabase Auth UUIDs.

```ts
import { createClient } from '@supabase/supabase-js';
import type { VercelRequest } from '@vercel/node';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY!
);

export async function getUserId(req: VercelRequest): Promise<string | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) return null;
  return user.id;
}
```

**Step 2: Commit**

```bash
git add api/_lib/auth.ts
git commit -m "feat: add Supabase JWT verification for API routes"
```

---

## Task 3: Create shared API helper for frontend

**Files:**
- Create: `src/lib/api.ts`

**Step 1: Create the fetch wrapper**

All hooks use this instead of `supabase.from()`. Attaches the Supabase session token automatically.

```ts
import { supabase } from '@/integrations/supabase/client';

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
git commit -m "feat: add API fetch helper with Supabase token injection"
```

---

## Task 4: Create API routes for tasks + update hook

**Files:**
- Create: `api/tasks.ts`
- Modify: `src/hooks/useTasks.ts`

**Step 1: Create `api/tasks.ts`**

```ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../src/db';
import { tasks } from '../src/db/schema';
import { eq, and, asc } from 'drizzle-orm';
import { getUserId } from './_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const userId = await getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method === 'GET') {
    const data = await db.select().from(tasks)
      .where(eq(tasks.user_id, userId))
      .orderBy(asc(tasks.sort_order));
    return res.json(data);
  }

  if (req.method === 'POST') {
    const body = req.body;
    const [row] = await db.insert(tasks).values({
      id: body.id,
      user_id: userId,
      title: body.title,
      notes: body.notes ?? null,
      estimate_minutes: body.estimate_minutes ?? null,
      status: body.status ?? 'todo',
      sort_order: body.sort_order ?? 0,
    }).returning();
    return res.json(row);
  }

  if (req.method === 'PATCH') {
    const { id, ...updates } = req.body;
    await db.update(tasks).set(updates)
      .where(and(eq(tasks.id, id), eq(tasks.user_id, userId)));
    return res.json({ ok: true });
  }

  if (req.method === 'DELETE') {
    const { id } = req.body;
    await db.delete(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.user_id, userId)));
    return res.json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
```

**Step 2: Update `src/hooks/useTasks.ts`**

Replace `import { supabase } from '@/integrations/supabase/client'` with `import { apiFetch } from '@/lib/api'`.

In every `if (isLoggedIn && user)` branch:
- Load: `const data = await apiFetch<TaskItem[]>('/api/tasks')`
- Create: `await apiFetch('/api/tasks', { method: 'POST', body: JSON.stringify({ id: newTask.id, title, notes, estimate_minutes, status, sort_order }) })`
- Update: `await apiFetch('/api/tasks', { method: 'PATCH', body: JSON.stringify({ id, ...updates }) })`
- Toggle: `await apiFetch('/api/tasks', { method: 'PATCH', body: JSON.stringify({ id, status: newStatus }) })`
- Delete: `await apiFetch('/api/tasks', { method: 'DELETE', body: JSON.stringify({ id }) })`
- Reorder: `await Promise.all(updated.map(t => apiFetch('/api/tasks', { method: 'PATCH', body: JSON.stringify({ id: t.id, sort_order: t.sort_order }) })))`

Guest localStorage logic stays unchanged.

**Step 3: Commit**

```bash
git add api/tasks.ts src/hooks/useTasks.ts
git commit -m "feat: migrate tasks to Turso API routes"
```

---

## Task 5: Create API routes for emotions + update hook

**Files:**
- Create: `api/emotions.ts`
- Modify: `src/hooks/useEmotions.ts`

**Step 1: Create `api/emotions.ts`**

Same pattern as tasks:
- `GET` - select where user_id, order by logged_at desc
- `POST` - insert, return row
- `DELETE` - delete where id + user_id

**Step 2: Update `src/hooks/useEmotions.ts`**

Replace `supabase.from('emotions').*` with `apiFetch` calls. Guest logic unchanged.

**Step 3: Commit**

```bash
git add api/emotions.ts src/hooks/useEmotions.ts
git commit -m "feat: migrate emotions to Turso API routes"
```

---

## Task 6: Create API routes for habits + habit_logs + update hook

**Files:**
- Create: `api/habits.ts`
- Create: `api/habit-logs.ts`
- Modify: `src/hooks/useHabits.ts`

**Step 1: Create `api/habits.ts`**

- `GET` - list by user_id, order by created_at asc
- `POST` - insert, return row
- `PATCH` - update by id + user_id
- `DELETE` - delete by id + user_id (cascade deletes logs via FK)

**Step 2: Create `api/habit-logs.ts`**

- `GET` - list by user_id
- `POST` - upsert using `onConflictDoUpdate` on the `(habit_id, date)` unique index defined in schema

```ts
// Upsert example for habit logs
await db.insert(habitLogs).values({
  user_id: userId,
  habit_id: body.habit_id,
  date: body.date,
  value: body.value,
}).onConflictDoUpdate({
  target: [habitLogs.habit_id, habitLogs.date],
  set: { value: body.value, updated_at: new Date().toISOString() },
}).returning();
```

**Step 3: Update `src/hooks/useHabits.ts`**

Load habits and logs via two parallel `apiFetch` calls. Replace all Supabase calls.

**Step 4: Commit**

```bash
git add api/habits.ts api/habit-logs.ts src/hooks/useHabits.ts
git commit -m "feat: migrate habits and habit logs to Turso API routes"
```

---

## Task 7: Create API routes for journal entries + update hook

**Files:**
- Create: `api/journal-entries.ts`
- Modify: `src/hooks/useJournalEntries.ts`

**Step 1: Create `api/journal-entries.ts`**

- `GET` - list by user_id, order by date desc. Supports `?offset=N&limit=N` query params. Returns `{ data: [...], count: N }`.
- `POST` - insert
- `PATCH` - update content by id + user_id
- `DELETE` - delete by id + user_id

For count, use a separate `SELECT count(*) FROM journal_entries WHERE user_id = ?` query.

**Step 2: Update `src/hooks/useJournalEntries.ts`**

Replace `.range()` pagination with `?offset=X&limit=Y` query params on the fetch URL.

**Step 3: Commit**

```bash
git add api/journal-entries.ts src/hooks/useJournalEntries.ts
git commit -m "feat: migrate journal entries to Turso API routes"
```

---

## Task 8: Create API routes for life rules + update hook

**Files:**
- Create: `api/life-rules.ts`
- Modify: `src/hooks/useLifeRules.ts`

**Step 1: Create `api/life-rules.ts`**

- `GET` - list by user_id, order by position asc
- `POST` - insert, return row
- `PATCH` - single update by id, OR batch `{ items: [{id, position}, ...] }` for reorder
- `DELETE` - delete by id + user_id

**Step 2: Update `src/hooks/useLifeRules.ts`**

For reorder, send a single PATCH with all positions instead of N parallel calls.

**Step 3: Commit**

```bash
git add api/life-rules.ts src/hooks/useLifeRules.ts
git commit -m "feat: migrate life rules to Turso API routes"
```

---

## Task 9: Create API routes for schedules + profiles, update hooks

**Files:**
- Create: `api/schedules.ts`
- Create: `api/profiles.ts`
- Modify: `src/hooks/useSchedule.ts`
- Modify: `src/hooks/useAuth.ts`

**Step 1: Create `api/schedules.ts`**

- `GET` - get single schedule by user_id (return null if not found)
- `POST` - upsert by user_id using `onConflictDoUpdate` on the unique index

**Step 2: Create `api/profiles.ts`**

- `GET` - get profile by user_id (return null if not found)
- `PATCH` - update profile fields (dob, name, etc.) by user_id

**Step 3: Update `src/hooks/useSchedule.ts`**

Replace `supabase.from('schedules').*` with `apiFetch`. The JSON `blocks` column is stored as text in SQLite -- Drizzle handles serialization via `{ mode: 'json' }`.

**Step 4: Update `src/hooks/useAuth.ts`**

Only `fetchProfile` and `updateDob` change to `apiFetch`. All auth methods stay on Supabase:
- `supabase.auth.onAuthStateChange` -- stays
- `supabase.auth.getSession` -- stays
- `supabase.auth.signOut` -- stays

**Step 5: Commit**

```bash
git add api/schedules.ts api/profiles.ts src/hooks/useSchedule.ts src/hooks/useAuth.ts
git commit -m "feat: migrate schedules and profiles to Turso API routes"
```

---

## Task 10: Create data migration script

**Files:**
- Create: `scripts/migrate-to-turso.ts`

**Step 1: Write the migration script**

```ts
// scripts/migrate-to-turso.ts
// Run with: npx tsx scripts/migrate-to-turso.ts
//
// Reads all data from Supabase (via service role key to bypass RLS),
// writes to Turso. Preserves all IDs and user_ids.

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient as createTursoClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from '../src/db/schema';

const supabase = createSupabaseClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const turso = createTursoClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});
const db = drizzle(turso, { schema });

async function migrateTable(
  name: string,
  table: any,
) {
  console.log(`Migrating ${name}...`);
  const { data, error } = await supabase.from(name).select('*');
  if (error) throw new Error(`Failed to read ${name}: ${error.message}`);
  if (!data || data.length === 0) {
    console.log(`  ${name}: 0 rows, skipping`);
    return;
  }
  // Insert in batches of 50 (SQLite has variable limits)
  for (let i = 0; i < data.length; i += 50) {
    const batch = data.slice(i, i + 50);
    await db.insert(table).values(batch);
  }
  console.log(`  ${name}: ${data.length} rows migrated`);
}

async function main() {
  // Order: parent tables first, then children (FK constraints)
  await migrateTable('profiles', schema.profiles);
  await migrateTable('projects', schema.projects);
  await migrateTable('tasks', schema.tasks);
  await migrateTable('habits', schema.habits);
  await migrateTable('habit_logs', schema.habitLogs);
  await migrateTable('emotions', schema.emotions);
  await migrateTable('journal_entries', schema.journalEntries);
  await migrateTable('life_rules', schema.lifeRules);
  await migrateTable('schedules', schema.schedules);
  await migrateTable('time_sessions', schema.timeSessions);

  console.log('\nMigration complete!');
  process.exit(0);
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
```

**Step 2: Run the migration**

```bash
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"  # from Supabase dashboard > Settings > API
npx tsx scripts/migrate-to-turso.ts
```

**Step 3: Verify data**

```bash
turso db shell little-log "SELECT 'profiles' as tbl, count(*) as cnt FROM profiles UNION ALL SELECT 'tasks', count(*) FROM tasks UNION ALL SELECT 'habits', count(*) FROM habits UNION ALL SELECT 'emotions', count(*) FROM emotions UNION ALL SELECT 'journal_entries', count(*) FROM journal_entries UNION ALL SELECT 'life_rules', count(*) FROM life_rules UNION ALL SELECT 'schedules', count(*) FROM schedules;"
```

Compare counts with Supabase dashboard.

**Step 4: Commit**

```bash
git add scripts/migrate-to-turso.ts
git commit -m "feat: add Supabase-to-Turso data migration script"
```

---

## Task 11: Clean up and deploy

**Files:**
- Modify: `.env` (ensure no secrets committed)
- Remove unused: `src/integrations/supabase/types.ts` (replaced by Drizzle schema)

**Step 1: Add env vars to Vercel**

```bash
vercel env add TURSO_DATABASE_URL
vercel env add TURSO_AUTH_TOKEN
```

Ensure `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are already set in Vercel.

**Step 2: Verify no remaining Supabase data calls**

Grep for `supabase.from(` -- should return zero results. The only remaining Supabase imports:
- `src/integrations/supabase/client.ts` (kept for auth)
- `src/hooks/useAuth.ts` (auth methods only)
- `src/pages/Auth.tsx` (OAuth login)
- `src/lib/api.ts` (gets session token)
- `api/_lib/auth.ts` (JWT verification)

**Step 3: Remove `src/integrations/supabase/types.ts`**

No longer needed -- Drizzle schema is the source of truth.

**Step 4: Test full app locally**

```bash
pnpm dev
```

Verify: tasks, habits, emotions, journal, life rules, schedule, profile -- all CRUD operations.

**Step 5: Deploy**

```bash
vercel --prod
```

**Step 6: Final commit**

```bash
git add -A
git commit -m "chore: complete Supabase-to-Turso migration, clean up"
```
