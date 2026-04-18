import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, dailyCheckins } from './_lib/db';
import { and, desc, eq, gte } from 'drizzle-orm';
import { getUserId } from './_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const userId = await getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  switch (req.method) {
    case 'GET': {
      const since = typeof req.query.since === 'string' ? req.query.since : undefined;
      const rows = since
        ? await db
            .select()
            .from(dailyCheckins)
            .where(and(eq(dailyCheckins.user_id, userId), gte(dailyCheckins.date, since)))
            .orderBy(desc(dailyCheckins.date))
        : await db
            .select()
            .from(dailyCheckins)
            .where(eq(dailyCheckins.user_id, userId))
            .orderBy(desc(dailyCheckins.date))
            .limit(90);
      return res.status(200).json(rows);
    }

    case 'POST': {
      const {
        date,
        am_intents,
        am_regret,
        sleep_hours,
        psi_score,
        pm_wins,
        pm_wastes,
        pm_score,
      } = req.body ?? {};
      if (!date) return res.status(400).json({ error: 'date required' });

      const [existing] = await db
        .select()
        .from(dailyCheckins)
        .where(and(eq(dailyCheckins.user_id, userId), eq(dailyCheckins.date, date)))
        .limit(1);

      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (am_intents !== undefined) updates.am_intents = am_intents;
      if (am_regret !== undefined) updates.am_regret = am_regret;
      if (sleep_hours !== undefined) updates.sleep_hours = sleep_hours;
      if (psi_score !== undefined) updates.psi_score = psi_score;
      if (pm_wins !== undefined) updates.pm_wins = pm_wins;
      if (pm_wastes !== undefined) updates.pm_wastes = pm_wastes;
      if (pm_score !== undefined) updates.pm_score = pm_score;

      const gotAm = (am_intents && am_intents.length) || am_regret;
      const gotPm = pm_wins || pm_wastes || pm_score != null;
      updates.hit = Boolean(gotAm || gotPm || (existing?.hit));

      if (!existing) {
        const [inserted] = await db
          .insert(dailyCheckins)
          .values({ user_id: userId, date, ...updates })
          .returning();
        return res.status(201).json(inserted);
      }

      const [row] = await db
        .update(dailyCheckins)
        .set(updates)
        .where(and(eq(dailyCheckins.user_id, userId), eq(dailyCheckins.date, date)))
        .returning();
      return res.status(200).json(row);
    }

    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}
