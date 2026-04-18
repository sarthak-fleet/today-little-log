import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, devLogs } from './_lib/db';
import { and, desc, eq } from 'drizzle-orm';
import { getUserId } from './_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const userId = await getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  switch (req.method) {
    case 'GET': {
      const rows = await db
        .select()
        .from(devLogs)
        .where(eq(devLogs.user_id, userId))
        .orderBy(desc(devLogs.date))
        .limit(180);
      return res.status(200).json(rows);
    }

    case 'POST': {
      const { date, leetcode_count, deep_work_minutes, commits, summary } = req.body ?? {};
      if (!date) return res.status(400).json({ error: 'date required' });

      const [existing] = await db
        .select()
        .from(devLogs)
        .where(and(eq(devLogs.user_id, userId), eq(devLogs.date, date)))
        .limit(1);

      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (leetcode_count !== undefined) updates.leetcode_count = leetcode_count;
      if (deep_work_minutes !== undefined) updates.deep_work_minutes = deep_work_minutes;
      if (commits !== undefined) updates.commits = commits;
      if (summary !== undefined) updates.summary = summary;

      if (!existing) {
        const [inserted] = await db
          .insert(devLogs)
          .values({
            user_id: userId,
            date,
            leetcode_count: leetcode_count ?? 0,
            deep_work_minutes: deep_work_minutes ?? 0,
            commits: commits ?? 0,
            summary: summary ?? null,
          })
          .returning();
        return res.status(201).json(inserted);
      }

      const [row] = await db
        .update(devLogs)
        .set(updates)
        .where(and(eq(devLogs.user_id, userId), eq(devLogs.date, date)))
        .returning();
      return res.status(200).json(row);
    }

    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}
