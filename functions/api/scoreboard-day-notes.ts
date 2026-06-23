import { and, desc, eq, gte } from 'drizzle-orm';
import { scoreboardDayNotes, scoreboardMonthLocks } from '../../src/db/schema';
import { createDb, requireUserId, json, type Env } from './_helpers';

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function cleanMonth(value: unknown): string {
  return typeof value === 'string' && /^\d{4}-\d{2}$/.test(value) ? value : currentMonth();
}

function monthFromDate(date: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date.slice(0, 7) : currentMonth();
}

function cleanReason(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const db = createDb(context.env);
  const userId = await requireUserId(context.request, context.env, db);
  if (!userId) return json({ error: 'Unauthorized' }, { status: 401 });

  const { method } = context.request;
  const url = new URL(context.request.url);

  if (method === 'GET') {
    const since = url.searchParams.get('since');
    const month = url.searchParams.get('month');
    const rows = since
      ? await db
          .select()
          .from(scoreboardDayNotes)
          .where(and(eq(scoreboardDayNotes.user_id, userId), gte(scoreboardDayNotes.date, since)))
          .orderBy(desc(scoreboardDayNotes.date))
      : month
        ? await db
            .select()
            .from(scoreboardDayNotes)
            .where(
              and(
                eq(scoreboardDayNotes.user_id, userId),
                eq(scoreboardDayNotes.score_month, cleanMonth(month))
              )
            )
            .orderBy(desc(scoreboardDayNotes.date))
        : await db
            .select()
            .from(scoreboardDayNotes)
            .where(eq(scoreboardDayNotes.user_id, userId))
            .orderBy(desc(scoreboardDayNotes.date))
            .limit(500);
    return json(rows);
  }

  if (method === 'POST') {
    const body = (await context.request.json().catch(() => ({}))) as Record<string, unknown>;
    const date = typeof body.date === 'string' ? body.date : '';
    if (!date) return json({ error: 'date required' }, { status: 400 });

    const month = monthFromDate(date);
    if (await isMonthLocked(db, userId, month)) {
      return json({ error: 'Month is locked' }, { status: 423 });
    }

    const [existing] = await db
      .select()
      .from(scoreboardDayNotes)
      .where(and(eq(scoreboardDayNotes.user_id, userId), eq(scoreboardDayNotes.date, date)))
      .limit(1);

    const now = new Date().toISOString();
    const low_score_reason = cleanReason(body.low_score_reason);

    if (!existing) {
      const [inserted] = await db
        .insert(scoreboardDayNotes)
        .values({
          user_id: userId,
          score_month: month,
          date,
          low_score_reason,
          created_at: now,
          updated_at: now,
        })
        .returning();
      return json(inserted, { status: 201 });
    }

    const [row] = await db
      .update(scoreboardDayNotes)
      .set({
        score_month: month,
        low_score_reason,
        updated_at: now,
      })
      .where(and(eq(scoreboardDayNotes.user_id, userId), eq(scoreboardDayNotes.date, date)))
      .returning();
    return json(row);
  }

  return json({ error: 'Method not allowed' }, { status: 405 });
};

async function isMonthLocked(db: ReturnType<typeof createDb>, userId: string, month: string) {
  const [lock] = await db
    .select()
    .from(scoreboardMonthLocks)
    .where(
      and(eq(scoreboardMonthLocks.user_id, userId), eq(scoreboardMonthLocks.score_month, month))
    )
    .limit(1);
  return Boolean(lock);
}
