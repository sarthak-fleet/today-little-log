import { and, asc, desc, eq } from 'drizzle-orm';
import {
  profiles, journalEntries, tasks, habits, habitLogs,
  userStats, dailyCheckins,
} from '../../src/db/schema';
import { createDb, requireUserId, json, type Env } from './_helpers';

type DB = ReturnType<typeof createDb>;

const today = () => new Date().toISOString().slice(0, 10);
const daysBetween = (a: string | null, b: string) => {
  if (!a) return 0;
  return Math.max(0, Math.round((+new Date(b + 'T00:00:00Z') - +new Date(a + 'T00:00:00Z')) / 86_400_000));
};

// ── profiles ───────────────────────────────────────────────
async function handleProfiles(method: string, db: DB, userId: string, body: Record<string, unknown>): Promise<Response> {
  if (method === 'GET') {
    const [row] = await db.select().from(profiles).where(eq(profiles.user_id, userId)).limit(1);
    return json(row ?? null);
  }
  if (method === 'PATCH') {
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const k of ['dob', 'name', 'avatar_url', 'identity_statement', 'sleep_target_bed', 'sleep_target_wake'] as const) {
      if (body[k] !== undefined) updates[k] = body[k];
    }
    const [existing] = await db.select().from(profiles).where(eq(profiles.user_id, userId)).limit(1);
    if (!existing) {
      const [inserted] = await db.insert(profiles).values({ user_id: userId, ...updates }).returning();
      return json(inserted ?? null);
    }
    const [row] = await db.update(profiles).set(updates).where(eq(profiles.user_id, userId)).returning();
    return json(row ?? null);
  }
  return json({ error: 'Method not allowed' }, { status: 405 });
}

// ── journal-entries ────────────────────────────────────────
async function handleJournalEntries(method: string, db: DB, userId: string, body: Record<string, unknown>, url: URL): Promise<Response> {
  if (method === 'GET') {
    const offset = Number(url.searchParams.get('offset') ?? 0) || 0;
    const limit = Math.min(Math.max(Number(url.searchParams.get('limit') ?? 10) || 10, 1), 50);
    const rows = await db.select().from(journalEntries)
      .where(eq(journalEntries.user_id, userId))
      .orderBy(desc(journalEntries.date))
      .offset(offset)
      .limit(limit + 1);
    const hasMore = rows.length > limit;
    return json({ data: hasMore ? rows.slice(0, limit) : rows, hasMore });
  }
  if (method === 'POST') {
    const { date, content, entry_type } = body as { date?: string; content?: string; entry_type?: string };
    const [row] = await db.insert(journalEntries)
      .values({ user_id: userId, date: date ?? today(), content: content ?? '', entry_type: entry_type ?? 'daily' })
      .returning();
    return json(row, { status: 201 });
  }
  if (method === 'PATCH') {
    const { id, content } = body as { id?: string; content?: string };
    if (!id) return json({ error: 'id required' }, { status: 400 });
    const [row] = await db.update(journalEntries)
      .set({ content: content ?? '', updated_at: new Date().toISOString() })
      .where(and(eq(journalEntries.id, id), eq(journalEntries.user_id, userId)))
      .returning();
    return json(row);
  }
  if (method === 'DELETE') {
    const { id } = body as { id?: string };
    if (!id) return json({ error: 'id required' }, { status: 400 });
    await db.delete(journalEntries).where(and(eq(journalEntries.id, id), eq(journalEntries.user_id, userId)));
    return json({ ok: true });
  }
  return json({ error: 'Method not allowed' }, { status: 405 });
}

// ── tasks ──────────────────────────────────────────────────
async function handleTasks(method: string, db: DB, userId: string, body: Record<string, unknown>): Promise<Response> {
  if (method === 'GET') {
    const rows = await db.select().from(tasks).where(eq(tasks.user_id, userId)).orderBy(asc(tasks.sort_order));
    return json(rows);
  }
  if (method === 'POST') {
    const { id, title, notes, estimate_minutes, status, sort_order, project_id } = body as Record<string, unknown>;
    const [inserted] = await db.insert(tasks).values({
      id: id as string | undefined,
      user_id: userId,
      title: String(title ?? ''),
      notes: notes as string | null ?? null,
      estimate_minutes: estimate_minutes as number | null ?? null,
      status: (status as string) ?? 'todo',
      sort_order: (sort_order as number) ?? 0,
      project_id: project_id as string | null ?? null,
    }).returning();
    return json(inserted, { status: 201 });
  }
  if (method === 'PATCH') {
    const { id, ...updates } = body as Record<string, unknown>;
    if (!id) return json({ error: 'id required' }, { status: 400 });
    delete (updates as Record<string, unknown>).user_id;
    await db.update(tasks).set({ ...updates, updated_at: new Date().toISOString() })
      .where(and(eq(tasks.id, id as string), eq(tasks.user_id, userId)));
    return json({ ok: true });
  }
  if (method === 'DELETE') {
    const { id } = body as { id?: string };
    if (!id) return json({ error: 'id required' }, { status: 400 });
    await db.delete(tasks).where(and(eq(tasks.id, id), eq(tasks.user_id, userId)));
    return json({ ok: true });
  }
  return json({ error: 'Method not allowed' }, { status: 405 });
}

// ── habits ─────────────────────────────────────────────────
async function handleHabits(method: string, db: DB, userId: string, body: Record<string, unknown>): Promise<Response> {
  if (method === 'GET') {
    const rows = await db.select().from(habits).where(eq(habits.user_id, userId)).orderBy(asc(habits.created_at));
    return json(rows);
  }
  if (method === 'POST') {
    const { title, target_type, track_type, frequency, target_value } = body as Record<string, unknown>;
    const [inserted] = await db.insert(habits).values({
      user_id: userId,
      title: String(title ?? ''),
      target_type: (target_type as string) ?? 'target',
      track_type: (track_type as string) ?? 'count',
      frequency: (frequency as string) ?? 'daily',
      target_value: (target_value as number) ?? 1,
    }).returning();
    return json(inserted, { status: 201 });
  }
  if (method === 'PATCH') {
    const { id, ...updates } = body as Record<string, unknown>;
    if (!id) return json({ error: 'id required' }, { status: 400 });
    delete (updates as Record<string, unknown>).user_id;
    await db.update(habits).set({ ...updates, updated_at: new Date().toISOString() })
      .where(and(eq(habits.id, id as string), eq(habits.user_id, userId)));
    return json({ ok: true });
  }
  if (method === 'DELETE') {
    const { id } = body as { id?: string };
    if (!id) return json({ error: 'id required' }, { status: 400 });
    await db.delete(habits).where(and(eq(habits.id, id), eq(habits.user_id, userId)));
    return json({ ok: true });
  }
  return json({ error: 'Method not allowed' }, { status: 405 });
}

// ── habit-logs ─────────────────────────────────────────────
async function handleHabitLogs(method: string, db: DB, userId: string, body: Record<string, unknown>): Promise<Response> {
  if (method === 'GET') {
    const rows = await db.select().from(habitLogs).where(eq(habitLogs.user_id, userId));
    return json(rows);
  }
  if (method === 'POST') {
    const { habit_id, date, value } = body as { habit_id?: string; date?: string; value?: number };
    if (!habit_id || !date) return json({ error: 'habit_id + date required' }, { status: 400 });
    const [row] = await db.insert(habitLogs).values({
      user_id: userId,
      habit_id,
      date,
      value: value ?? 0,
    }).onConflictDoUpdate({
      target: [habitLogs.habit_id, habitLogs.date],
      set: { value: value ?? 0, updated_at: new Date().toISOString() },
    }).returning();
    return json(row);
  }
  return json({ error: 'Method not allowed' }, { status: 405 });
}

// ── user-stats ─────────────────────────────────────────────
async function readOrCreateStats(db: DB, userId: string) {
  const [existing] = await db.select().from(userStats).where(eq(userStats.user_id, userId)).limit(1);
  if (existing) return existing;
  const [inserted] = await db.insert(userStats).values({ user_id: userId, life_score: 50, xp: 0, last_activity_date: null }).returning();
  return inserted;
}

async function handleUserStats(method: string, db: DB, userId: string, body: Record<string, unknown>): Promise<Response> {
  const MIN = 0, MAX = 100;
  if (method === 'GET') {
    const row = await readOrCreateStats(db, userId);
    const idle = daysBetween(row.last_activity_date, today());
    const decayed = Math.max(MIN, row.life_score - idle);
    if (idle > 0) {
      await db.update(userStats).set({ life_score: decayed, updated_at: new Date().toISOString() }).where(eq(userStats.user_id, userId));
    }
    return json({ life_score: decayed, xp: row.xp, last_activity_date: row.last_activity_date });
  }
  if (method === 'POST') {
    const xp = Number(body.xp ?? 0) || 0;
    const score = Number(body.score ?? 0) || 0;
    const row = await readOrCreateStats(db, userId);
    const idle = daysBetween(row.last_activity_date, today());
    const newScore = Math.min(MAX, Math.max(MIN, Math.max(MIN, row.life_score - idle) + score));
    const newXp = Math.max(0, row.xp + xp);
    await db.update(userStats).set({
      life_score: newScore, xp: newXp, last_activity_date: today(), updated_at: new Date().toISOString(),
    }).where(eq(userStats.user_id, userId));
    return json({ life_score: newScore, xp: newXp, last_activity_date: today() });
  }
  return json({ error: 'Method not allowed' }, { status: 405 });
}

// ── daily-checkins ─────────────────────────────────────────
async function handleDailyCheckins(method: string, db: DB, userId: string, body: Record<string, unknown>): Promise<Response> {
  if (method === 'GET') {
    const rows = await db.select().from(dailyCheckins)
      .where(eq(dailyCheckins.user_id, userId))
      .orderBy(desc(dailyCheckins.date))
      .limit(90);
    return json(rows);
  }
  if (method === 'POST') {
    const { date, am_intents, am_regret, sleep_hours, psi_score, pm_wins, pm_wastes, pm_score } = body as Record<string, unknown>;
    if (!date || typeof date !== 'string') return json({ error: 'date required' }, { status: 400 });
    const [existing] = await db.select().from(dailyCheckins)
      .where(and(eq(dailyCheckins.user_id, userId), eq(dailyCheckins.date, date))).limit(1);
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (am_intents !== undefined) updates.am_intents = am_intents;
    if (am_regret !== undefined) updates.am_regret = am_regret;
    if (sleep_hours !== undefined) updates.sleep_hours = sleep_hours;
    if (psi_score !== undefined) updates.psi_score = psi_score;
    if (pm_wins !== undefined) updates.pm_wins = pm_wins;
    if (pm_wastes !== undefined) updates.pm_wastes = pm_wastes;
    if (pm_score !== undefined) updates.pm_score = pm_score;
    const gotAm = (Array.isArray(am_intents) && am_intents.length) || am_regret;
    const gotPm = pm_wins || pm_wastes || pm_score != null;
    updates.hit = Boolean(gotAm || gotPm || existing?.hit);
    if (!existing) {
      const [inserted] = await db.insert(dailyCheckins).values({ user_id: userId, date, ...updates }).returning();
      return json(inserted, { status: 201 });
    }
    const [row] = await db.update(dailyCheckins).set(updates)
      .where(and(eq(dailyCheckins.user_id, userId), eq(dailyCheckins.date, date)))
      .returning();
    return json(row);
  }
  return json({ error: 'Method not allowed' }, { status: 405 });
}

// ── router ─────────────────────────────────────────────────
export const onRequest: PagesFunction<Env, 'resource'> = async (context) => {
  const db = createDb(context.env);
  const userId = await requireUserId(context.request, context.env, db);
  if (!userId) return json({ error: 'Unauthorized' }, { status: 401 });

  const resource = String(context.params.resource ?? '');
  const method = context.request.method;
  const url = new URL(context.request.url);

  let body: Record<string, unknown> = {};
  const hasBody = method !== 'GET' && method !== 'HEAD';
  if (hasBody) {
    try {
      const text = await context.request.text();
      body = text ? JSON.parse(text) : {};
    } catch {
      body = {};
    }
  }

  try {
    switch (resource) {
      case 'profiles':         return await handleProfiles(method, db, userId, body);
      case 'daily-checkins':   return await handleDailyCheckins(method, db, userId, body);
      case 'journal-entries':  return await handleJournalEntries(method, db, userId, body, url);
      case 'tasks':            return await handleTasks(method, db, userId, body);
      case 'habits':           return await handleHabits(method, db, userId, body);
      case 'habit-logs':       return await handleHabitLogs(method, db, userId, body);
      case 'user-stats':       return await handleUserStats(method, db, userId, body);
      default:                 return json({ error: `unknown resource "${resource}"` }, { status: 404 });
    }
  } catch (err) {
    console.error(`[${resource}]`, err);
    return json({ error: 'Internal error' }, { status: 500 });
  }
};
