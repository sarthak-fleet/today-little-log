import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from './_lib/db';
import { getUserId } from './_lib/auth';
import { profiles } from './_lib/db';
import { eq, sql } from 'drizzle-orm';

// Legacy column list — guaranteed present even if migrations 0001/0002/0003
// haven't been run yet against the live Turso DB. Falls back to this when a
// full SELECT fails because newer columns don't exist.
const LEGACY_COLUMNS = {
  id: profiles.id,
  user_id: profiles.user_id,
  name: profiles.name,
  avatar_url: profiles.avatar_url,
  dob: profiles.dob,
  created_at: profiles.created_at,
  updated_at: profiles.updated_at,
};

const NEW_COLUMNS = ['identity_statement', 'sleep_target_bed', 'sleep_target_wake'] as const;

async function selectProfileRow(userId: string) {
  // Try full select first (fast path, works after migration 0001 is applied).
  try {
    const [row] = await db.select().from(profiles).where(eq(profiles.user_id, userId)).limit(1);
    return row ?? null;
  } catch {
    // Fallback: legacy columns only. Keeps the app usable even without the
    // new migrations. Newer columns come back as undefined on the client.
    const [row] = await db.select(LEGACY_COLUMNS).from(profiles).where(eq(profiles.user_id, userId)).limit(1);
    return row ?? null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const userId = await getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  switch (req.method) {
    case 'GET': {
      const row = await selectProfileRow(userId);
      return res.json(row);
    }

    case 'PATCH': {
      const body = req.body ?? {};
      const {
        dob,
        name,
        avatar_url,
        identity_statement,
        sleep_target_bed,
        sleep_target_wake,
      } = body;
      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (dob !== undefined) updates.dob = dob;
      if (name !== undefined) updates.name = name;
      if (avatar_url !== undefined) updates.avatar_url = avatar_url;
      if (identity_statement !== undefined) updates.identity_statement = identity_statement;
      if (sleep_target_bed !== undefined) updates.sleep_target_bed = sleep_target_bed;
      if (sleep_target_wake !== undefined) updates.sleep_target_wake = sleep_target_wake;

      const existing = await selectProfileRow(userId);

      async function tryWrite(): Promise<Record<string, unknown> | null> {
        if (!existing) {
          const [inserted] = await db
            .insert(profiles)
            .values({ user_id: userId, ...updates })
            .returning();
          return inserted ?? null;
        }
        const [row] = await db.update(profiles)
          .set(updates)
          .where(eq(profiles.user_id, userId))
          .returning();
        return row ?? null;
      }

      try {
        const row = await tryWrite();
        return res.json(row);
      } catch (err) {
        // Retry without the new columns when the DB schema lags behind.
        for (const col of NEW_COLUMNS) delete updates[col];
        if (!existing) {
          try {
            // Raw insert through sql`` so missing columns in legacy schema don't explode.
            await db.insert(profiles).values({ user_id: userId, ...updates });
            const retry = await selectProfileRow(userId);
            return res.json(retry);
          } catch {
            return res.status(500).json({ error: 'Profile write failed. Run pending migrations.' });
          }
        }
        try {
          await db.update(profiles).set(updates).where(eq(profiles.user_id, userId));
          const retry = await selectProfileRow(userId);
          return res.json(retry);
        } catch {
          // Surface a hint so the client can show a one-liner.
          return res.status(500).json({
            error: 'Profile write failed. Run pending migrations.',
            detail: (err as Error).message,
          });
        }
      }
      // unreachable
      void sql; // keep import if unused
    }

    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}
