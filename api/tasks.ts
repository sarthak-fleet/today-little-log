import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from './_lib/db';
import { tasks } from './_lib/db';
import { eq, and, asc } from 'drizzle-orm';
import { getUserId } from './_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const userId = await getUserId(req);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  switch (req.method) {
    case 'GET': {
      const rows = await db
        .select()
        .from(tasks)
        .where(eq(tasks.user_id, userId))
        .orderBy(asc(tasks.sort_order));

      return res.status(200).json(rows);
    }

    case 'POST': {
      const { id, title, notes, estimate_minutes, status, sort_order, project_id } = req.body;

      const [inserted] = await db
        .insert(tasks)
        .values({
          id,
          user_id: userId,
          title,
          notes,
          estimate_minutes,
          status,
          sort_order,
          project_id,
        })
        .returning();

      return res.status(201).json(inserted);
    }

    case 'PATCH': {
      const { id, ...updates } = req.body;

      // Strip user_id from updates to prevent ownership tampering
      delete updates.user_id;

      await db
        .update(tasks)
        .set({ ...updates, updated_at: new Date().toISOString() })
        .where(and(eq(tasks.id, id), eq(tasks.user_id, userId)));

      return res.status(200).json({ ok: true });
    }

    case 'DELETE': {
      const { id } = req.body;

      await db
        .delete(tasks)
        .where(and(eq(tasks.id, id), eq(tasks.user_id, userId)));

      return res.status(200).json({ ok: true });
    }

    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}
