import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, goalActions, goals } from './_lib/db';
import { and, desc, eq } from 'drizzle-orm';
import { getUserId } from './_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const userId = await getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  switch (req.method) {
    case 'GET': {
      const rows = await db
        .select()
        .from(goalActions)
        .where(eq(goalActions.user_id, userId))
        .orderBy(desc(goalActions.action_at))
        .limit(500);
      return res.status(200).json(rows);
    }

    case 'POST': {
      const { goal_id, delta, source, note } = req.body ?? {};
      if (!goal_id || typeof delta !== 'number') return res.status(400).json({ error: 'goal_id + delta required' });

      // Confirm ownership.
      const [goal] = await db.select().from(goals).where(and(eq(goals.id, goal_id), eq(goals.user_id, userId))).limit(1);
      if (!goal) return res.status(404).json({ error: 'Goal not found' });

      const [inserted] = await db
        .insert(goalActions)
        .values({ user_id: userId, goal_id, delta, source: source ?? null, note: note ?? null })
        .returning();

      // Update current probability.
      const newProb = Math.max(0, Math.min(100, goal.probability + delta));
      await db
        .update(goals)
        .set({ probability: newProb, updated_at: new Date().toISOString() })
        .where(eq(goals.id, goal_id));

      return res.status(201).json({ action: inserted, probability: newProb });
    }

    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}
