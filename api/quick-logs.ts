import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, quickLogs } from './_lib/db';
import { and, desc, eq, gte } from 'drizzle-orm';
import { getUserId } from './_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const userId = await getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  switch (req.method) {
    case 'GET': {
      const sinceQ = typeof req.query.since === 'string' ? req.query.since : undefined;
      const rows = sinceQ
        ? await db
            .select()
            .from(quickLogs)
            .where(and(eq(quickLogs.user_id, userId), gte(quickLogs.logged_at, sinceQ)))
            .orderBy(desc(quickLogs.logged_at))
        : await db
            .select()
            .from(quickLogs)
            .where(eq(quickLogs.user_id, userId))
            .orderBy(desc(quickLogs.logged_at))
            .limit(200);
      return res.status(200).json(rows);
    }

    case 'POST': {
      const { kind, value_num, value_text } = req.body ?? {};
      if (!kind) return res.status(400).json({ error: 'kind required' });
      const [inserted] = await db
        .insert(quickLogs)
        .values({ user_id: userId, kind, value_num: value_num ?? null, value_text: value_text ?? null })
        .returning();
      return res.status(201).json(inserted);
    }

    case 'DELETE': {
      const { id } = req.body ?? {};
      if (!id) return res.status(400).json({ error: 'id required' });
      await db.delete(quickLogs).where(and(eq(quickLogs.id, id), eq(quickLogs.user_id, userId)));
      return res.status(200).json({ ok: true });
    }

    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}
