import { and, asc, eq } from 'drizzle-orm';
import { scoreboardItems } from '../../src/db/schema';
import { createDb, requireUserId, json, type Env } from './_helpers';
import { defaultScoreboardItems } from '../../src/lib/scoreboardDefaults';

export const onRequest: PagesFunction<Env> = async (context) => {
  const db = createDb(context.env);
  const userId = await requireUserId(context.request, context.env, db);
  if (!userId) return json({ error: 'Unauthorized' }, { status: 401 });

  const { method } = context.request;

  if (method === 'GET') {
    await seedMissingDefaults(db, userId);
    const rows = await db.select().from(scoreboardItems)
      .where(eq(scoreboardItems.user_id, userId))
      .orderBy(asc(scoreboardItems.position), asc(scoreboardItems.created_at));
    return json(rows);
  }

  if (method === 'POST') {
    const body = await context.request.json().catch(() => ({})) as Record<string, unknown>;
    const { id: itemId, label, kind, position, archived } = body;
    if (typeof itemId === 'string' && itemId) {
      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (label !== undefined) updates.label = label;
      if (kind !== undefined) updates.kind = kind;
      if (position !== undefined) updates.position = position;
      if (archived !== undefined) updates.archived = Boolean(archived);
      const [row] = await db.update(scoreboardItems).set(updates)
        .where(and(eq(scoreboardItems.id, itemId), eq(scoreboardItems.user_id, userId)))
        .returning();
      if (!row) return json({ error: 'Item not found' }, { status: 404 });
      return json(row);
    }
    if (typeof label !== 'string' || !label.trim()) {
      return json({ error: 'label required' }, { status: 400 });
    }
    const [inserted] = await db.insert(scoreboardItems).values({
      user_id: userId,
      label: label.trim(),
      kind: kind === 'output' ? 'output' : 'check',
      position: typeof position === 'number' ? position : 0,
      archived: false,
    }).returning();
    return json(inserted, { status: 201 });
  }

  if (method === 'DELETE') {
    const url = new URL(context.request.url);
    const itemId = url.searchParams.get('id') ?? '';
    if (!itemId) return json({ error: 'id required' }, { status: 400 });
    await db.delete(scoreboardItems)
      .where(and(eq(scoreboardItems.id, itemId), eq(scoreboardItems.user_id, userId)));
    return new Response(null, { status: 204 });
  }

  return json({ error: 'Method not allowed' }, { status: 405 });
};

async function seedMissingDefaults(db: ReturnType<typeof createDb>, userId: string) {
  const rows = await db.select().from(scoreboardItems)
    .where(eq(scoreboardItems.user_id, userId));
  const existingLabels = new Set(rows.map((row) => row.label.trim().toLowerCase()));
  const missing = defaultScoreboardItems.filter((item) => !existingLabels.has(item.label.toLowerCase()));
  if (missing.length === 0) return;

  await db.insert(scoreboardItems).values(missing.map((item) => ({
    user_id: userId,
    label: item.label,
    kind: item.kind,
    position: item.position,
    archived: false,
  })));
}
