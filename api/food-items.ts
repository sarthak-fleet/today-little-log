import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, foodItems } from './_lib/db';
import { and, asc, eq, like, or } from 'drizzle-orm';
import { getUserId } from './_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const userId = await getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  switch (req.method) {
    case 'GET': {
      const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
      const rows = q
        ? await db
            .select()
            .from(foodItems)
            .where(and(eq(foodItems.user_id, userId), or(like(foodItems.name, `%${q}%`), like(foodItems.name, `${q}%`))))
            .orderBy(asc(foodItems.name))
            .limit(50)
        : await db.select().from(foodItems).where(eq(foodItems.user_id, userId)).orderBy(asc(foodItems.name)).limit(200);
      return res.status(200).json(rows);
    }

    case 'POST': {
      const { name, calories_per_serving, protein_g, carbs_g, fat_g, unit } = req.body ?? {};
      if (!name || typeof calories_per_serving !== 'number') return res.status(400).json({ error: 'name + calories_per_serving required' });
      const [inserted] = await db
        .insert(foodItems)
        .values({
          user_id: userId,
          name,
          calories_per_serving,
          protein_g: protein_g ?? 0,
          carbs_g: carbs_g ?? 0,
          fat_g: fat_g ?? 0,
          unit: unit ?? 'serving',
        })
        .returning();
      return res.status(201).json(inserted);
    }

    case 'DELETE': {
      const { id } = req.body ?? {};
      if (!id) return res.status(400).json({ error: 'id required' });
      await db.delete(foodItems).where(and(eq(foodItems.id, id), eq(foodItems.user_id, userId)));
      return res.status(200).json({ ok: true });
    }

    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}
