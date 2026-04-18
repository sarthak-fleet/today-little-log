import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, weightLogs } from './_lib/db';
import { and, desc, eq } from 'drizzle-orm';
import { getUserId } from './_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const userId = await getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  switch (req.method) {
    case 'GET': {
      const rows = await db
        .select()
        .from(weightLogs)
        .where(eq(weightLogs.user_id, userId))
        .orderBy(desc(weightLogs.date))
        .limit(365);
      return res.status(200).json(rows);
    }

    case 'POST': {
      const { date, kg, notes } = req.body ?? {};
      if (!date || typeof kg !== 'number') {
        return res.status(400).json({ error: 'date + kg required' });
      }

      // Upsert: replace same-day entry if exists.
      const [existing] = await db
        .select()
        .from(weightLogs)
        .where(and(eq(weightLogs.user_id, userId), eq(weightLogs.date, date)))
        .limit(1);

      if (existing) {
        await db
          .update(weightLogs)
          .set({ kg, notes: notes ?? null, updated_at: new Date().toISOString() })
          .where(and(eq(weightLogs.user_id, userId), eq(weightLogs.date, date)));
        return res.status(200).json({ ...existing, kg, notes: notes ?? null });
      }

      const [inserted] = await db
        .insert(weightLogs)
        .values({ user_id: userId, date, kg, notes: notes ?? null })
        .returning();
      return res.status(201).json(inserted);
    }

    case 'DELETE': {
      const { id } = req.body ?? {};
      if (!id) return res.status(400).json({ error: 'id required' });
      await db.delete(weightLogs).where(and(eq(weightLogs.id, id), eq(weightLogs.user_id, userId)));
      return res.status(200).json({ ok: true });
    }

    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}
