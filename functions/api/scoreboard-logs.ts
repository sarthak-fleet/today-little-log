import { and, desc, eq, gte } from 'drizzle-orm';
import { scoreboardItems, scoreboardLogs } from '../../src/db/schema';
import { createDb, requireUserId, json, type Env } from './_helpers';

export const onRequest: PagesFunction<Env> = async (context) => {
  const db = createDb(context.env);
  const userId = await requireUserId(context.request, context.env, db);
  if (!userId) return json({ error: 'Unauthorized' }, { status: 401 });

  const { method } = context.request;
  const url = new URL(context.request.url);

  if (method === 'GET') {
    const since = url.searchParams.get('since');
    const rows = since
      ? await db.select().from(scoreboardLogs)
          .where(and(eq(scoreboardLogs.user_id, userId), gte(scoreboardLogs.date, since)))
          .orderBy(desc(scoreboardLogs.date))
      : await db.select().from(scoreboardLogs)
          .where(eq(scoreboardLogs.user_id, userId))
          .orderBy(desc(scoreboardLogs.date))
          .limit(500);
    return json(rows);
  }

  if (method === 'POST') {
    const body = await context.request.json().catch(() => ({})) as Record<string, unknown>;
    const item_id = typeof body.item_id === 'string' ? body.item_id : '';
    const date = typeof body.date === 'string' ? body.date : '';
    if (!item_id || !date) return json({ error: 'item_id + date required' }, { status: 400 });

    const [item] = await db.select().from(scoreboardItems)
      .where(and(eq(scoreboardItems.id, item_id), eq(scoreboardItems.user_id, userId))).limit(1);
    if (!item) return json({ error: 'Item not found' }, { status: 404 });

    const [existing] = await db.select().from(scoreboardLogs)
      .where(and(eq(scoreboardLogs.item_id, item_id), eq(scoreboardLogs.date, date))).limit(1);

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.value_bool !== undefined) updates.value_bool = Boolean(body.value_bool);
    if (body.value_text !== undefined) updates.value_text = body.value_text;

    if (!existing) {
      const [inserted] = await db.insert(scoreboardLogs).values({
        user_id: userId, item_id, date,
        value_bool: Boolean(body.value_bool ?? false),
        value_text: typeof body.value_text === 'string' ? body.value_text : null,
      }).returning();
      return json(inserted, { status: 201 });
    }
    const [row] = await db.update(scoreboardLogs).set(updates)
      .where(and(eq(scoreboardLogs.item_id, item_id), eq(scoreboardLogs.date, date)))
      .returning();
    return json(row);
  }

  return json({ error: 'Method not allowed' }, { status: 405 });
};
