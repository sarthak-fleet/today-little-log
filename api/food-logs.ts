import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, foodLogs, foodItems } from './_lib/db';
import { and, desc, eq, gte } from 'drizzle-orm';
import { getUserId } from './_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const userId = await getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  switch (req.method) {
    case 'GET': {
      const since = typeof req.query.since === 'string' ? req.query.since : undefined;
      const rows = await db
        .select({
          id: foodLogs.id,
          date: foodLogs.date,
          servings: foodLogs.servings,
          meal_type: foodLogs.meal_type,
          food_item_id: foodLogs.food_item_id,
          name: foodItems.name,
          calories_per_serving: foodItems.calories_per_serving,
          protein_g: foodItems.protein_g,
          carbs_g: foodItems.carbs_g,
          fat_g: foodItems.fat_g,
          unit: foodItems.unit,
        })
        .from(foodLogs)
        .leftJoin(foodItems, eq(foodLogs.food_item_id, foodItems.id))
        .where(since
          ? and(eq(foodLogs.user_id, userId), gte(foodLogs.date, since))
          : eq(foodLogs.user_id, userId))
        .orderBy(desc(foodLogs.date))
        .limit(400);
      return res.status(200).json(rows);
    }

    case 'POST': {
      const { date, food_item_id, servings, meal_type } = req.body ?? {};
      if (!date || !food_item_id) return res.status(400).json({ error: 'date + food_item_id required' });
      const [inserted] = await db
        .insert(foodLogs)
        .values({ user_id: userId, date, food_item_id, servings: servings ?? 1, meal_type: meal_type ?? null })
        .returning();
      return res.status(201).json(inserted);
    }

    case 'DELETE': {
      const { id } = req.body ?? {};
      if (!id) return res.status(400).json({ error: 'id required' });
      await db.delete(foodLogs).where(and(eq(foodLogs.id, id), eq(foodLogs.user_id, userId)));
      return res.status(200).json({ ok: true });
    }

    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}
