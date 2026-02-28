import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from './_lib/db';
import { getUserId } from './_lib/auth';
import { journalEntries } from './_lib/db';
import { eq, and, desc } from 'drizzle-orm';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const userId = await getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  switch (req.method) {
    case 'GET': {
      const offset = Number(req.query.offset) || 0;
      const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);

      const rows = await db.select()
        .from(journalEntries)
        .where(eq(journalEntries.user_id, userId))
        .orderBy(desc(journalEntries.date))
        .offset(offset)
        .limit(limit + 1);

      const hasMore = rows.length > limit;
      const data = hasMore ? rows.slice(0, limit) : rows;

      return res.json({ data, hasMore });
    }

    case 'POST': {
      const { date, content, entry_type } = req.body;
      const [row] = await db.insert(journalEntries)
        .values({ user_id: userId, date, content, entry_type })
        .returning();
      return res.status(201).json(row);
    }

    case 'PATCH': {
      const { id, content } = req.body;
      const [row] = await db.update(journalEntries)
        .set({ content, updated_at: new Date().toISOString() })
        .where(and(eq(journalEntries.id, id), eq(journalEntries.user_id, userId)))
        .returning();
      return res.json(row);
    }

    case 'DELETE': {
      const { id } = req.body;
      await db.delete(journalEntries)
        .where(and(eq(journalEntries.id, id), eq(journalEntries.user_id, userId)));
      return res.json({ ok: true });
    }

    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}
