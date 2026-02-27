import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../src/db/index';
import { getUserId } from './_lib/auth';
import { journalEntries } from '../src/db/schema';
import { eq, and, desc, count, sql } from 'drizzle-orm';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const userId = await getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  switch (req.method) {
    case 'GET': {
      const offset = Number(req.query.offset) || 0;
      const limit = Number(req.query.limit) || 10;

      const [data, [{ total }]] = await Promise.all([
        db.select()
          .from(journalEntries)
          .where(eq(journalEntries.user_id, userId))
          .orderBy(desc(journalEntries.date))
          .offset(offset)
          .limit(limit),
        db.select({ total: count() })
          .from(journalEntries)
          .where(eq(journalEntries.user_id, userId)),
      ]);

      return res.json({ data, count: total });
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
