import { and, eq } from 'drizzle-orm';
import { scoreboardMonthLocks } from '../../src/db/schema';
import { createDb, requireUserId, json, type Env } from './_helpers';

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function cleanMonth(value: unknown): string {
  return typeof value === 'string' && /^\d{4}-\d{2}$/.test(value) ? value : currentMonth();
}

type LockKind = 'publish' | 'finalize';

function cleanKind(value: unknown): LockKind {
  return value === 'publish' ? 'publish' : 'finalize';
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const db = createDb(context.env);
  const userId = await requireUserId(context.request, context.env, db);
  if (!userId) return json({ error: 'Unauthorized' }, { status: 401 });

  const { method } = context.request;
  const url = new URL(context.request.url);

  if (method === 'GET') {
    const month = cleanMonth(url.searchParams.get('month'));
    const [row] = await db.select().from(scoreboardMonthLocks)
      .where(and(eq(scoreboardMonthLocks.user_id, userId), eq(scoreboardMonthLocks.score_month, month)))
      .limit(1);
    return json({
      locked: Boolean(row?.locked_at),
      published: Boolean(row?.published_at),
      lock: row ?? null,
    });
  }

  if (method === 'POST') {
    const body = await context.request.json().catch(() => ({})) as Record<string, unknown>;
    const month = cleanMonth(body.score_month);
    const kind = cleanKind(body.kind);
    const now = new Date().toISOString();

    const [existing] = await db.select().from(scoreboardMonthLocks)
      .where(and(eq(scoreboardMonthLocks.user_id, userId), eq(scoreboardMonthLocks.score_month, month)))
      .limit(1);

    if (existing) {
      const patch = kind === 'publish'
        ? { published_at: existing.published_at ?? now }
        : { locked_at: existing.locked_at ?? now };
      await db.update(scoreboardMonthLocks)
        .set(patch)
        .where(eq(scoreboardMonthLocks.id, existing.id));
      const [updated] = await db.select().from(scoreboardMonthLocks)
        .where(eq(scoreboardMonthLocks.id, existing.id)).limit(1);
      return json({
        locked: Boolean(updated?.locked_at),
        published: Boolean(updated?.published_at),
        lock: updated,
      });
    }

    const [inserted] = await db.insert(scoreboardMonthLocks).values({
      user_id: userId,
      score_month: month,
      locked_at: kind === 'finalize' ? now : null,
      published_at: kind === 'publish' ? now : null,
      created_at: now,
    }).returning();
    return json({
      locked: Boolean(inserted.locked_at),
      published: Boolean(inserted.published_at),
      lock: inserted,
    }, { status: 201 });
  }

  if (method === 'DELETE') {
    // Unpublish only — never delete a finalize record.
    const month = cleanMonth(url.searchParams.get('month'));
    const kind = cleanKind(url.searchParams.get('kind'));
    if (kind !== 'publish') {
      return json({ error: 'Only publish state can be reverted.' }, { status: 400 });
    }
    const [existing] = await db.select().from(scoreboardMonthLocks)
      .where(and(eq(scoreboardMonthLocks.user_id, userId), eq(scoreboardMonthLocks.score_month, month)))
      .limit(1);
    if (!existing) return json({ ok: true });
    if (existing.locked_at) {
      return json({ error: 'Month is locked; cannot unpublish.' }, { status: 409 });
    }
    await db.update(scoreboardMonthLocks)
      .set({ published_at: null })
      .where(eq(scoreboardMonthLocks.id, existing.id));
    return json({ ok: true });
  }

  return json({ error: 'Method not allowed' }, { status: 405 });
};
