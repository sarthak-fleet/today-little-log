import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from './_lib/db';
import { getUserId } from './_lib/auth';
import { profiles } from './_lib/db';
import { eq } from 'drizzle-orm';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const userId = await getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  switch (req.method) {
    case 'GET': {
      const [row] = await db.select()
        .from(profiles)
        .where(eq(profiles.user_id, userId))
        .limit(1);
      return res.json(row ?? null);
    }

    case 'PATCH': {
      const {
        dob,
        name,
        avatar_url,
        identity_statement,
        sleep_target_bed,
        sleep_target_wake,
      } = req.body;
      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (dob !== undefined) updates.dob = dob;
      if (name !== undefined) updates.name = name;
      if (avatar_url !== undefined) updates.avatar_url = avatar_url;
      if (identity_statement !== undefined) updates.identity_statement = identity_statement;
      if (sleep_target_bed !== undefined) updates.sleep_target_bed = sleep_target_bed;
      if (sleep_target_wake !== undefined) updates.sleep_target_wake = sleep_target_wake;

      // Upsert: insert if no row exists, else update.
      const [existing] = await db.select().from(profiles).where(eq(profiles.user_id, userId)).limit(1);
      if (!existing) {
        const [inserted] = await db
          .insert(profiles)
          .values({ user_id: userId, ...updates })
          .returning();
        return res.json(inserted);
      }

      const [row] = await db.update(profiles)
        .set(updates)
        .where(eq(profiles.user_id, userId))
        .returning();
      return res.json(row);
    }

    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}
