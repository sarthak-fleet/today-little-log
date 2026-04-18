import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, weeklyReviews } from './_lib/db';
import { and, desc, eq } from 'drizzle-orm';
import { getUserId } from './_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const userId = await getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  switch (req.method) {
    case 'GET': {
      const rows = await db
        .select()
        .from(weeklyReviews)
        .where(eq(weeklyReviews.user_id, userId))
        .orderBy(desc(weeklyReviews.week_start))
        .limit(26);
      return res.status(200).json(rows);
    }

    case 'POST': {
      const { week_start, achieved, gratitude } = req.body ?? {};
      if (!week_start) return res.status(400).json({ error: 'week_start required' });

      const [existing] = await db
        .select()
        .from(weeklyReviews)
        .where(and(eq(weeklyReviews.user_id, userId), eq(weeklyReviews.week_start, week_start)))
        .limit(1);

      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (achieved !== undefined) updates.achieved = achieved;
      if (gratitude !== undefined) updates.gratitude = gratitude;

      if (!existing) {
        const [inserted] = await db
          .insert(weeklyReviews)
          .values({
            user_id: userId,
            week_start,
            achieved: achieved ?? null,
            gratitude: gratitude ?? null,
          })
          .returning();
        return res.status(201).json(inserted);
      }

      const [row] = await db
        .update(weeklyReviews)
        .set(updates)
        .where(and(eq(weeklyReviews.user_id, userId), eq(weeklyReviews.week_start, week_start)))
        .returning();
      return res.status(200).json(row);
    }

    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}
