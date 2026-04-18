import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, urgeLogs } from './_lib/db';
import { and, desc, eq } from 'drizzle-orm';
import { getUserId } from './_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const userId = await getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  switch (req.method) {
    case 'GET': {
      const rows = await db
        .select()
        .from(urgeLogs)
        .where(eq(urgeLogs.user_id, userId))
        .orderBy(desc(urgeLogs.logged_at))
        .limit(100);
      return res.status(200).json(rows);
    }

    case 'POST': {
      const { trigger, reflection } = req.body ?? {};
      if (!trigger) return res.status(400).json({ error: 'trigger required' });
      const now = new Date();
      const expires = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
      const [inserted] = await db
        .insert(urgeLogs)
        .values({
          user_id: userId,
          trigger,
          reflection: reflection ?? null,
          status: 'cooldown',
          expires_at: expires,
        })
        .returning();
      return res.status(201).json(inserted);
    }

    case 'PATCH': {
      const { id, status, reflection } = req.body ?? {};
      if (!id) return res.status(400).json({ error: 'id required' });
      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (status) updates.status = status;
      if (reflection !== undefined) updates.reflection = reflection;
      const [row] = await db
        .update(urgeLogs)
        .set(updates)
        .where(and(eq(urgeLogs.id, id), eq(urgeLogs.user_id, userId)))
        .returning();
      return res.status(200).json(row);
    }

    case 'DELETE': {
      const { id } = req.body ?? {};
      await db.delete(urgeLogs).where(and(eq(urgeLogs.id, id), eq(urgeLogs.user_id, userId)));
      return res.status(200).json({ ok: true });
    }

    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}
