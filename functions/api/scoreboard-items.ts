import { and, asc, eq } from 'drizzle-orm';
import { scoreboardItems, scoreboardMonthLocks } from '../../src/db/schema';
import { createDb, requireUserId, json, type Env } from './_helpers';

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function cleanMonth(value: unknown): string {
  return typeof value === 'string' && /^\d{4}-\d{2}$/.test(value) ? value : currentMonth();
}

function cleanMinScore(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.round(parsed);
}

function cleanMaxScore(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 1;
  return Math.round(parsed);
}

function cleanIdealScore(value: unknown, maxScore: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return Math.max(0, maxScore);
  return Math.max(0, Math.round(parsed));
}

function cleanCriteria(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function cleanSourceKey(value: unknown): string | null {
  return typeof value === 'string' && /^[a-z0-9-]+$/.test(value) ? value : null;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const db = createDb(context.env);
  const userId = await requireUserId(context.request, context.env, db);
  if (!userId) return json({ error: 'Unauthorized' }, { status: 401 });

  const { method } = context.request;
  const url = new URL(context.request.url);

  if (method === 'GET') {
    const month = url.searchParams.get('month');
    const where = month
      ? and(eq(scoreboardItems.user_id, userId), eq(scoreboardItems.score_month, cleanMonth(month)))
      : eq(scoreboardItems.user_id, userId);
    const rows = await db.select().from(scoreboardItems)
      .where(where)
      .orderBy(asc(scoreboardItems.position), asc(scoreboardItems.created_at));
    return json(rows);
  }

  if (method === 'POST') {
    const body = await context.request.json().catch(() => ({})) as Record<string, unknown>;
    const { id: itemId, label, kind, position, archived, score_month, source_key, min_score, max_score, ideal_score, criteria } = body;
    if (typeof itemId === 'string' && itemId) {
      const [existingItem] = await db.select().from(scoreboardItems)
        .where(and(eq(scoreboardItems.id, itemId), eq(scoreboardItems.user_id, userId)))
        .limit(1);
      if (!existingItem) return json({ error: 'Item not found' }, { status: 404 });
      if (await isMonthLocked(db, userId, existingItem.score_month)) {
        return json({ error: 'Month is locked' }, { status: 423 });
      }

      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (typeof label === 'string' && label.trim()) updates.label = label.trim();
      if (kind !== undefined) updates.kind = kind === 'check' || kind === 'output' ? kind : 'score';
      if (score_month !== undefined) updates.score_month = cleanMonth(score_month);
      if (source_key !== undefined) updates.source_key = cleanSourceKey(source_key);
      if (min_score !== undefined) updates.min_score = cleanMinScore(min_score);
      if (max_score !== undefined) updates.max_score = cleanMaxScore(max_score);
      if (ideal_score !== undefined) updates.ideal_score = cleanIdealScore(ideal_score, cleanMaxScore(max_score ?? existingItem.max_score));
      if (criteria !== undefined) updates.criteria = cleanCriteria(criteria);
      if (position !== undefined) updates.position = Number(position);
      if (archived !== undefined) updates.archived = Boolean(archived);
      const [row] = await db.update(scoreboardItems).set(updates)
        .where(and(eq(scoreboardItems.id, itemId), eq(scoreboardItems.user_id, userId)))
        .returning();
      return json(row);
    }
    if (typeof label !== 'string' || !label.trim()) {
      return json({ error: 'label required' }, { status: 400 });
    }
    const month = cleanMonth(score_month);
    if (await isMonthLocked(db, userId, month)) {
      return json({ error: 'Month is locked' }, { status: 423 });
    }
    const maxScore = cleanMaxScore(max_score);
    const [inserted] = await db.insert(scoreboardItems).values({
      user_id: userId,
      label: label.trim(),
      kind: kind === 'check' || kind === 'output' ? kind : 'score',
      score_month: month,
      source_key: cleanSourceKey(source_key),
      min_score: cleanMinScore(min_score),
      max_score: maxScore,
      ideal_score: cleanIdealScore(ideal_score, maxScore),
      criteria: cleanCriteria(criteria),
      position: typeof position === 'number' ? position : 0,
      archived: false,
    }).returning();
    return json(inserted, { status: 201 });
  }

  if (method === 'DELETE') {
    const itemId = url.searchParams.get('id') ?? '';
    if (!itemId) return json({ error: 'id required' }, { status: 400 });
    const [existingItem] = await db.select().from(scoreboardItems)
      .where(and(eq(scoreboardItems.id, itemId), eq(scoreboardItems.user_id, userId)))
      .limit(1);
    if (!existingItem) return json({ error: 'Item not found' }, { status: 404 });
    if (await isMonthLocked(db, userId, existingItem.score_month)) {
      return json({ error: 'Month is locked' }, { status: 423 });
    }
    await db.delete(scoreboardItems)
      .where(and(eq(scoreboardItems.id, itemId), eq(scoreboardItems.user_id, userId)));
    return new Response(null, { status: 204 });
  }

  return json({ error: 'Method not allowed' }, { status: 405 });
};

async function isMonthLocked(db: ReturnType<typeof createDb>, userId: string, month: string) {
  const [lock] = await db.select().from(scoreboardMonthLocks)
    .where(and(eq(scoreboardMonthLocks.user_id, userId), eq(scoreboardMonthLocks.score_month, month)))
    .limit(1);
  return Boolean(lock);
}
