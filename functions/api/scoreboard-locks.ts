import { and, eq } from 'drizzle-orm';
import { scoreboardMonthLocks } from '../../src/db/schema';
import { createDb, requireUserId, json, type Env } from './_helpers';

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function cleanMonth(value: unknown): string {
  return typeof value === 'string' && /^\d{4}-\d{2}$/.test(value) ? value : currentMonth();
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const db = createDb(context.env);
  const userId = await requireUserId(context.request, context.env, db);
  if (!userId) return json({ error: 'Unauthorized' }, { status: 401 });

  const { method } = context.request;
  const url = new URL(context.request.url);

  if (method === 'GET') {
    const month = cleanMonth(url.searchParams.get('month'));
    const [lock] = await db.select().from(scoreboardMonthLocks)
      .where(and(eq(scoreboardMonthLocks.user_id, userId), eq(scoreboardMonthLocks.score_month, month)))
      .limit(1);
    return json({ locked: Boolean(lock), lock: lock ?? null });
  }

  if (method === 'POST') {
    const body = await context.request.json().catch(() => ({})) as Record<string, unknown>;
    const month = cleanMonth(body.score_month);
    const [existing] = await db.select().from(scoreboardMonthLocks)
      .where(and(eq(scoreboardMonthLocks.user_id, userId), eq(scoreboardMonthLocks.score_month, month)))
      .limit(1);
    if (existing) return json({ locked: true, lock: existing });

    const now = new Date().toISOString();
    const [lock] = await db.insert(scoreboardMonthLocks).values({
      user_id: userId,
      score_month: month,
      locked_at: now,
      created_at: now,
    }).returning();
    return json({ locked: true, lock }, { status: 201 });
  }

  return json({ error: 'Method not allowed' }, { status: 405 });
};
