import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, manaState } from './_lib/db';
import { and, eq } from 'drizzle-orm';
import { getUserId } from './_lib/auth';

function today() { return new Date().toISOString().slice(0, 10); }

async function upsertToday(userId: string, dailyMax?: number, delta?: number) {
  const d = today();
  const [existing] = await db
    .select()
    .from(manaState)
    .where(and(eq(manaState.user_id, userId), eq(manaState.date, d)))
    .limit(1);

  if (!existing) {
    const max = dailyMax ?? 10;
    const [inserted] = await db
      .insert(manaState)
      .values({ user_id: userId, date: d, daily_max: max, bank_remaining: max + (delta ?? 0) })
      .returning();
    return inserted;
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (dailyMax !== undefined) {
    updates.daily_max = dailyMax;
    updates.bank_remaining = dailyMax;
  }
  if (delta !== undefined) {
    updates.bank_remaining = Math.max(0, existing.bank_remaining + delta);
  }
  const [row] = await db
    .update(manaState)
    .set(updates)
    .where(and(eq(manaState.user_id, userId), eq(manaState.date, d)))
    .returning();
  return row;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const userId = await getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  switch (req.method) {
    case 'GET': {
      const row = await upsertToday(userId);
      return res.status(200).json(row);
    }
    case 'POST': {
      const { daily_max, delta } = req.body ?? {};
      const row = await upsertToday(userId, daily_max, delta);
      return res.status(200).json(row);
    }
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}
