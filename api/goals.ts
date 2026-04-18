import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, goals } from './_lib/db';
import { and, asc, eq } from 'drizzle-orm';
import { getUserId } from './_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const userId = await getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  switch (req.method) {
    case 'GET': {
      const rows = await db
        .select()
        .from(goals)
        .where(eq(goals.user_id, userId))
        .orderBy(asc(goals.created_at));
      return res.status(200).json(rows);
    }

    case 'POST': {
      const { title, category, target_date, target_value_num, target_value_text } = req.body ?? {};
      if (!title) return res.status(400).json({ error: 'title required' });
      const [inserted] = await db
        .insert(goals)
        .values({
          user_id: userId,
          title,
          category: category ?? 'other',
          target_date: target_date ?? null,
          target_value_num: target_value_num ?? null,
          target_value_text: target_value_text ?? null,
          probability: 50,
        })
        .returning();
      return res.status(201).json(inserted);
    }

    case 'PATCH': {
      const { id, ...updates } = req.body ?? {};
      if (!id) return res.status(400).json({ error: 'id required' });
      delete updates.user_id;
      updates.updated_at = new Date().toISOString();
      const [row] = await db
        .update(goals)
        .set(updates)
        .where(and(eq(goals.id, id), eq(goals.user_id, userId)))
        .returning();
      return res.status(200).json(row);
    }

    case 'DELETE': {
      const { id } = req.body ?? {};
      if (!id) return res.status(400).json({ error: 'id required' });
      await db.delete(goals).where(and(eq(goals.id, id), eq(goals.user_id, userId)));
      return res.status(200).json({ ok: true });
    }

    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}
