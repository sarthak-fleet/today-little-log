import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../src/db';
import { getUserId } from './_lib/auth';
import { profiles } from '../src/db/schema';
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
      const { dob, name, avatar_url } = req.body;
      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (dob !== undefined) updates.dob = dob;
      if (name !== undefined) updates.name = name;
      if (avatar_url !== undefined) updates.avatar_url = avatar_url;

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
