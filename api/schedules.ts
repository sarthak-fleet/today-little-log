import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../src/db';
import { getUserId } from './_lib/auth';
import { schedules } from '../src/db/schema';
import { eq } from 'drizzle-orm';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const userId = await getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  switch (req.method) {
    case 'GET': {
      const [row] = await db.select()
        .from(schedules)
        .where(eq(schedules.user_id, userId))
        .limit(1);
      return res.json(row ?? null);
    }

    case 'POST': {
      const { blocks } = req.body;
      await db.insert(schedules)
        .values({ user_id: userId, blocks })
        .onConflictDoUpdate({
          target: [schedules.user_id],
          set: { blocks, updated_at: new Date().toISOString() },
        });
      return res.json({ ok: true });
    }

    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}
