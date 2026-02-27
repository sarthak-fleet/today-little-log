import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../src/db';
import { getUserId } from './_lib/auth';
import { lifeRules } from '../src/db/schema';
import { eq, and, asc } from 'drizzle-orm';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const userId = await getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  switch (req.method) {
    case 'GET': {
      const data = await db.select()
        .from(lifeRules)
        .where(eq(lifeRules.user_id, userId))
        .orderBy(asc(lifeRules.position));
      return res.json(data);
    }

    case 'POST': {
      const { content, position } = req.body;
      const [row] = await db.insert(lifeRules)
        .values({ user_id: userId, content, position })
        .returning();
      return res.status(201).json(row);
    }

    case 'PATCH': {
      const { items, id, content } = req.body;

      if (items && Array.isArray(items)) {
        for (const item of items) {
          await db.update(lifeRules)
            .set({ position: item.position, updated_at: new Date().toISOString() })
            .where(and(eq(lifeRules.id, item.id), eq(lifeRules.user_id, userId)));
        }
        return res.json({ ok: true });
      }

      const [row] = await db.update(lifeRules)
        .set({ content, updated_at: new Date().toISOString() })
        .where(and(eq(lifeRules.id, id), eq(lifeRules.user_id, userId)))
        .returning();
      return res.json(row);
    }

    case 'DELETE': {
      const { id } = req.body;
      await db.delete(lifeRules)
        .where(and(eq(lifeRules.id, id), eq(lifeRules.user_id, userId)));
      return res.json({ ok: true });
    }

    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}
