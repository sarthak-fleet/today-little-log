import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../src/db';
import { emotions } from '../src/db/schema';
import { eq, and, desc } from 'drizzle-orm';
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
        .from(emotions)
        .where(eq(emotions.user_id, userId))
        .orderBy(desc(emotions.logged_at));

      return res.status(200).json(rows);
    }

    case 'POST': {
      const { emotion, comment, logged_at } = req.body;

      if (!emotion || typeof emotion !== 'string') {
        return res.status(400).json({ error: 'emotion is required' });
      }

      const [inserted] = await db
        .insert(emotions)
        .values({
          user_id: userId,
          emotion,
          comment: comment ?? null,
          logged_at: logged_at ?? new Date().toISOString(),
        })
        .returning();

      return res.status(201).json(inserted);
    }

    case 'DELETE': {
      const { id } = req.body;

      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'id is required' });
      }

      await db
        .delete(emotions)
        .where(and(eq(emotions.id, id), eq(emotions.user_id, userId)));

      return res.status(200).json({ ok: true });
    }

    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}
