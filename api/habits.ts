import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../src/db/index';
import { habits } from '../src/db/schema';
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
        .from(habits)
        .where(eq(habits.user_id, userId))
        .orderBy(asc(habits.created_at));

      return res.status(200).json(rows);
    }

    case 'POST': {
      const { title, target_type, track_type, frequency, target_value } = req.body;

      const [inserted] = await db
        .insert(habits)
        .values({
          user_id: userId,
          title,
          target_type,
          track_type,
          frequency,
          target_value,
        })
        .returning();

      return res.status(201).json(inserted);
    }

    case 'PATCH': {
      const { id, ...updates } = req.body;

      // Strip user_id from updates to prevent ownership tampering
      delete updates.user_id;

      await db
        .update(habits)
        .set({ ...updates, updated_at: new Date().toISOString() })
        .where(and(eq(habits.id, id), eq(habits.user_id, userId)));

      return res.status(200).json({ ok: true });
    }

    case 'DELETE': {
      const { id } = req.body;

      await db
        .delete(habits)
        .where(and(eq(habits.id, id), eq(habits.user_id, userId)));

      return res.status(200).json({ ok: true });
    }

    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}
