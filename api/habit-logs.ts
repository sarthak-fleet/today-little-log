import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../src/db';
import { habitLogs } from '../src/db/schema';
import { eq, and } from 'drizzle-orm';
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
        .from(habitLogs)
        .where(eq(habitLogs.user_id, userId));

      return res.status(200).json(rows);
    }

    case 'POST': {
      const { habit_id, date, value } = req.body;

      const [row] = await db
        .insert(habitLogs)
        .values({
          user_id: userId,
          habit_id,
          date,
          value,
        })
        .onConflictDoUpdate({
          target: [habitLogs.habit_id, habitLogs.date],
          set: {
            value,
            updated_at: new Date().toISOString(),
          },
        })
        .returning();

      return res.status(200).json(row);
    }

    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}
