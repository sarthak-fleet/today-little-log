import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, userStats } from './_lib/db';
import { eq } from 'drizzle-orm';
import { getUserId } from './_lib/auth';

const MIN_SCORE = 0;
const MAX_SCORE = 100;

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(a: string | null, b: string): number {
  if (!a) return 0;
  const ta = new Date(a + 'T00:00:00Z').getTime();
  const tb = new Date(b + 'T00:00:00Z').getTime();
  return Math.max(0, Math.round((tb - ta) / 86_400_000));
}

async function readOrCreate(userId: string) {
  const [existing] = await db.select().from(userStats).where(eq(userStats.user_id, userId)).limit(1);
  if (existing) return existing;

  const [inserted] = await db
    .insert(userStats)
    .values({ user_id: userId, life_score: 50, xp: 0, last_activity_date: null })
    .returning();
  return inserted;
}

// Decay 1 point of life_score per full idle day, cap at 0.
function applyDecay(score: number, idleDays: number): number {
  return Math.max(MIN_SCORE, score - idleDays);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const userId = await getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  switch (req.method) {
    case 'GET': {
      const row = await readOrCreate(userId);
      const todayStr = today();
      const idle = daysBetween(row.last_activity_date, todayStr);
      const decayedScore = applyDecay(row.life_score, idle);

      if (idle > 0) {
        await db
          .update(userStats)
          .set({ life_score: decayedScore, updated_at: new Date().toISOString() })
          .where(eq(userStats.user_id, userId));
      }

      return res.status(200).json({
        life_score: decayedScore,
        xp: row.xp,
        last_activity_date: row.last_activity_date,
      });
    }

    case 'POST': {
      // Award XP + score delta. Body: { xp?: number, score?: number }
      const { xp = 0, score = 0 } = req.body ?? {};
      const row = await readOrCreate(userId);
      const todayStr = today();
      const idle = daysBetween(row.last_activity_date, todayStr);
      const newScore = Math.min(MAX_SCORE, Math.max(MIN_SCORE, applyDecay(row.life_score, idle) + score));
      const newXp = Math.max(0, row.xp + xp);

      await db
        .update(userStats)
        .set({
          life_score: newScore,
          xp: newXp,
          last_activity_date: todayStr,
          updated_at: new Date().toISOString(),
        })
        .where(eq(userStats.user_id, userId));

      return res.status(200).json({ life_score: newScore, xp: newXp, last_activity_date: todayStr });
    }

    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}
