import type { VercelRequest, VercelResponse } from '@vercel/node';
import { and, asc, desc, eq, gte, like, or } from 'drizzle-orm';
import {
  db,
  userStats,
  quickLogs,
  weightLogs,
  urgeLogs,
  dailyCheckins,
  devLogs,
  weeklyReviews,
  foodItems,
  foodLogs,
  goals,
  goalActions,
  manaState,
} from './_lib/db';
import { getUserId } from './_lib/auth';

/**
 * Single-function router for all new urgency/ritual endpoints.
 * Consolidated to stay under Vercel's Hobby-tier 12-function cap.
 * Each resource keeps its original /api/<name> URL via vercel.json rewrites.
 */

type Handler = (req: VercelRequest, res: VercelResponse, userId: string) => Promise<unknown>;

// ── helpers ────────────────────────────────────────────────
const today = () => new Date().toISOString().slice(0, 10);
const daysBetween = (a: string | null, b: string) => {
  if (!a) return 0;
  return Math.max(0, Math.round((+new Date(b + 'T00:00:00Z') - +new Date(a + 'T00:00:00Z')) / 86_400_000));
};

// ── user-stats ─────────────────────────────────────────────
async function readOrCreateStats(userId: string) {
  const [existing] = await db.select().from(userStats).where(eq(userStats.user_id, userId)).limit(1);
  if (existing) return existing;
  const [inserted] = await db.insert(userStats).values({ user_id: userId, life_score: 50, xp: 0, last_activity_date: null }).returning();
  return inserted;
}

const handleUserStats: Handler = async (req, res, userId) => {
  const MIN = 0, MAX = 100;
  if (req.method === 'GET') {
    const row = await readOrCreateStats(userId);
    const idle = daysBetween(row.last_activity_date, today());
    const decayed = Math.max(MIN, row.life_score - idle);
    if (idle > 0) {
      await db.update(userStats).set({ life_score: decayed, updated_at: new Date().toISOString() }).where(eq(userStats.user_id, userId));
    }
    return res.status(200).json({ life_score: decayed, xp: row.xp, last_activity_date: row.last_activity_date });
  }
  if (req.method === 'POST') {
    const { xp = 0, score = 0 } = req.body ?? {};
    const row = await readOrCreateStats(userId);
    const idle = daysBetween(row.last_activity_date, today());
    const newScore = Math.min(MAX, Math.max(MIN, Math.max(MIN, row.life_score - idle) + score));
    const newXp = Math.max(0, row.xp + xp);
    await db.update(userStats).set({ life_score: newScore, xp: newXp, last_activity_date: today(), updated_at: new Date().toISOString() }).where(eq(userStats.user_id, userId));
    return res.status(200).json({ life_score: newScore, xp: newXp, last_activity_date: today() });
  }
  return res.status(405).json({ error: 'Method not allowed' });
};

// ── quick-logs ─────────────────────────────────────────────
const handleQuickLogs: Handler = async (req, res, userId) => {
  if (req.method === 'GET') {
    const since = typeof req.query.since === 'string' ? req.query.since : undefined;
    const rows = since
      ? await db.select().from(quickLogs).where(and(eq(quickLogs.user_id, userId), gte(quickLogs.logged_at, since))).orderBy(desc(quickLogs.logged_at))
      : await db.select().from(quickLogs).where(eq(quickLogs.user_id, userId)).orderBy(desc(quickLogs.logged_at)).limit(200);
    return res.status(200).json(rows);
  }
  if (req.method === 'POST') {
    const { kind, value_num, value_text } = req.body ?? {};
    if (!kind) return res.status(400).json({ error: 'kind required' });
    const [inserted] = await db.insert(quickLogs).values({ user_id: userId, kind, value_num: value_num ?? null, value_text: value_text ?? null }).returning();
    return res.status(201).json(inserted);
  }
  if (req.method === 'DELETE') {
    const { id } = req.body ?? {};
    if (!id) return res.status(400).json({ error: 'id required' });
    await db.delete(quickLogs).where(and(eq(quickLogs.id, id), eq(quickLogs.user_id, userId)));
    return res.status(200).json({ ok: true });
  }
  return res.status(405).json({ error: 'Method not allowed' });
};

// ── weight-logs ────────────────────────────────────────────
const handleWeightLogs: Handler = async (req, res, userId) => {
  if (req.method === 'GET') {
    const rows = await db.select().from(weightLogs).where(eq(weightLogs.user_id, userId)).orderBy(desc(weightLogs.date)).limit(365);
    return res.status(200).json(rows);
  }
  if (req.method === 'POST') {
    const { date, kg, notes } = req.body ?? {};
    if (!date || typeof kg !== 'number') return res.status(400).json({ error: 'date + kg required' });
    const [existing] = await db.select().from(weightLogs).where(and(eq(weightLogs.user_id, userId), eq(weightLogs.date, date))).limit(1);
    if (existing) {
      await db.update(weightLogs).set({ kg, notes: notes ?? null, updated_at: new Date().toISOString() }).where(and(eq(weightLogs.user_id, userId), eq(weightLogs.date, date)));
      return res.status(200).json({ ...existing, kg, notes: notes ?? null });
    }
    const [inserted] = await db.insert(weightLogs).values({ user_id: userId, date, kg, notes: notes ?? null }).returning();
    return res.status(201).json(inserted);
  }
  if (req.method === 'DELETE') {
    const { id } = req.body ?? {};
    if (!id) return res.status(400).json({ error: 'id required' });
    await db.delete(weightLogs).where(and(eq(weightLogs.id, id), eq(weightLogs.user_id, userId)));
    return res.status(200).json({ ok: true });
  }
  return res.status(405).json({ error: 'Method not allowed' });
};

// ── urge-logs ──────────────────────────────────────────────
const handleUrgeLogs: Handler = async (req, res, userId) => {
  if (req.method === 'GET') {
    const rows = await db.select().from(urgeLogs).where(eq(urgeLogs.user_id, userId)).orderBy(desc(urgeLogs.logged_at)).limit(100);
    return res.status(200).json(rows);
  }
  if (req.method === 'POST') {
    const { trigger, reflection } = req.body ?? {};
    if (!trigger) return res.status(400).json({ error: 'trigger required' });
    const now = new Date();
    const expires = new Date(now.getTime() + 86_400_000).toISOString();
    const [inserted] = await db.insert(urgeLogs).values({ user_id: userId, trigger, reflection: reflection ?? null, status: 'cooldown', expires_at: expires }).returning();
    return res.status(201).json(inserted);
  }
  if (req.method === 'PATCH') {
    const { id, status, reflection } = req.body ?? {};
    if (!id) return res.status(400).json({ error: 'id required' });
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (status) updates.status = status;
    if (reflection !== undefined) updates.reflection = reflection;
    const [row] = await db.update(urgeLogs).set(updates).where(and(eq(urgeLogs.id, id), eq(urgeLogs.user_id, userId))).returning();
    return res.status(200).json(row);
  }
  if (req.method === 'DELETE') {
    const { id } = req.body ?? {};
    await db.delete(urgeLogs).where(and(eq(urgeLogs.id, id), eq(urgeLogs.user_id, userId)));
    return res.status(200).json({ ok: true });
  }
  return res.status(405).json({ error: 'Method not allowed' });
};

// ── daily-checkins ─────────────────────────────────────────
const handleDailyCheckins: Handler = async (req, res, userId) => {
  if (req.method === 'GET') {
    const since = typeof req.query.since === 'string' ? req.query.since : undefined;
    const rows = since
      ? await db.select().from(dailyCheckins).where(and(eq(dailyCheckins.user_id, userId), gte(dailyCheckins.date, since))).orderBy(desc(dailyCheckins.date))
      : await db.select().from(dailyCheckins).where(eq(dailyCheckins.user_id, userId)).orderBy(desc(dailyCheckins.date)).limit(90);
    return res.status(200).json(rows);
  }
  if (req.method === 'POST') {
    const { date, am_intents, am_regret, sleep_hours, psi_score, pm_wins, pm_wastes, pm_score } = req.body ?? {};
    if (!date) return res.status(400).json({ error: 'date required' });
    const [existing] = await db.select().from(dailyCheckins).where(and(eq(dailyCheckins.user_id, userId), eq(dailyCheckins.date, date))).limit(1);
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
    updates.hit = Boolean(gotAm || gotPm || existing?.hit);
    if (!existing) {
      const [inserted] = await db.insert(dailyCheckins).values({ user_id: userId, date, ...updates }).returning();
      return res.status(201).json(inserted);
    }
    const [row] = await db.update(dailyCheckins).set(updates).where(and(eq(dailyCheckins.user_id, userId), eq(dailyCheckins.date, date))).returning();
    return res.status(200).json(row);
  }
  return res.status(405).json({ error: 'Method not allowed' });
};

// ── dev-logs ───────────────────────────────────────────────
const handleDevLogs: Handler = async (req, res, userId) => {
  if (req.method === 'GET') {
    const rows = await db.select().from(devLogs).where(eq(devLogs.user_id, userId)).orderBy(desc(devLogs.date)).limit(180);
    return res.status(200).json(rows);
  }
  if (req.method === 'POST') {
    const { date, leetcode_count, deep_work_minutes, commits, summary } = req.body ?? {};
    if (!date) return res.status(400).json({ error: 'date required' });
    const [existing] = await db.select().from(devLogs).where(and(eq(devLogs.user_id, userId), eq(devLogs.date, date))).limit(1);
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (leetcode_count !== undefined) updates.leetcode_count = leetcode_count;
    if (deep_work_minutes !== undefined) updates.deep_work_minutes = deep_work_minutes;
    if (commits !== undefined) updates.commits = commits;
    if (summary !== undefined) updates.summary = summary;
    if (!existing) {
      const [inserted] = await db.insert(devLogs).values({
        user_id: userId, date,
        leetcode_count: leetcode_count ?? 0,
        deep_work_minutes: deep_work_minutes ?? 0,
        commits: commits ?? 0,
        summary: summary ?? null,
      }).returning();
      return res.status(201).json(inserted);
    }
    const [row] = await db.update(devLogs).set(updates).where(and(eq(devLogs.user_id, userId), eq(devLogs.date, date))).returning();
    return res.status(200).json(row);
  }
  return res.status(405).json({ error: 'Method not allowed' });
};

// ── weekly-reviews ─────────────────────────────────────────
const handleWeeklyReviews: Handler = async (req, res, userId) => {
  if (req.method === 'GET') {
    const rows = await db.select().from(weeklyReviews).where(eq(weeklyReviews.user_id, userId)).orderBy(desc(weeklyReviews.week_start)).limit(26);
    return res.status(200).json(rows);
  }
  if (req.method === 'POST') {
    const { week_start, achieved, gratitude } = req.body ?? {};
    if (!week_start) return res.status(400).json({ error: 'week_start required' });
    const [existing] = await db.select().from(weeklyReviews).where(and(eq(weeklyReviews.user_id, userId), eq(weeklyReviews.week_start, week_start))).limit(1);
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (achieved !== undefined) updates.achieved = achieved;
    if (gratitude !== undefined) updates.gratitude = gratitude;
    if (!existing) {
      const [inserted] = await db.insert(weeklyReviews).values({ user_id: userId, week_start, achieved: achieved ?? null, gratitude: gratitude ?? null }).returning();
      return res.status(201).json(inserted);
    }
    const [row] = await db.update(weeklyReviews).set(updates).where(and(eq(weeklyReviews.user_id, userId), eq(weeklyReviews.week_start, week_start))).returning();
    return res.status(200).json(row);
  }
  return res.status(405).json({ error: 'Method not allowed' });
};

// ── food-items ─────────────────────────────────────────────
const handleFoodItems: Handler = async (req, res, userId) => {
  if (req.method === 'GET') {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const rows = q
      ? await db.select().from(foodItems).where(and(eq(foodItems.user_id, userId), or(like(foodItems.name, `%${q}%`), like(foodItems.name, `${q}%`)))).orderBy(asc(foodItems.name)).limit(50)
      : await db.select().from(foodItems).where(eq(foodItems.user_id, userId)).orderBy(asc(foodItems.name)).limit(200);
    return res.status(200).json(rows);
  }
  if (req.method === 'POST') {
    const { name, calories_per_serving, protein_g, carbs_g, fat_g, unit } = req.body ?? {};
    if (!name || typeof calories_per_serving !== 'number') return res.status(400).json({ error: 'name + calories_per_serving required' });
    const [inserted] = await db.insert(foodItems).values({
      user_id: userId, name, calories_per_serving,
      protein_g: protein_g ?? 0, carbs_g: carbs_g ?? 0, fat_g: fat_g ?? 0,
      unit: unit ?? 'serving',
    }).returning();
    return res.status(201).json(inserted);
  }
  if (req.method === 'DELETE') {
    const { id } = req.body ?? {};
    if (!id) return res.status(400).json({ error: 'id required' });
    await db.delete(foodItems).where(and(eq(foodItems.id, id), eq(foodItems.user_id, userId)));
    return res.status(200).json({ ok: true });
  }
  return res.status(405).json({ error: 'Method not allowed' });
};

// ── food-logs ──────────────────────────────────────────────
const handleFoodLogs: Handler = async (req, res, userId) => {
  if (req.method === 'GET') {
    const since = typeof req.query.since === 'string' ? req.query.since : undefined;
    const rows = await db.select({
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
    }).from(foodLogs).leftJoin(foodItems, eq(foodLogs.food_item_id, foodItems.id))
      .where(since ? and(eq(foodLogs.user_id, userId), gte(foodLogs.date, since)) : eq(foodLogs.user_id, userId))
      .orderBy(desc(foodLogs.date)).limit(400);
    return res.status(200).json(rows);
  }
  if (req.method === 'POST') {
    const { date, food_item_id, servings, meal_type } = req.body ?? {};
    if (!date || !food_item_id) return res.status(400).json({ error: 'date + food_item_id required' });
    const [inserted] = await db.insert(foodLogs).values({ user_id: userId, date, food_item_id, servings: servings ?? 1, meal_type: meal_type ?? null }).returning();
    return res.status(201).json(inserted);
  }
  if (req.method === 'DELETE') {
    const { id } = req.body ?? {};
    if (!id) return res.status(400).json({ error: 'id required' });
    await db.delete(foodLogs).where(and(eq(foodLogs.id, id), eq(foodLogs.user_id, userId)));
    return res.status(200).json({ ok: true });
  }
  return res.status(405).json({ error: 'Method not allowed' });
};

// ── goals ──────────────────────────────────────────────────
const handleGoals: Handler = async (req, res, userId) => {
  if (req.method === 'GET') {
    const rows = await db.select().from(goals).where(eq(goals.user_id, userId)).orderBy(asc(goals.created_at));
    return res.status(200).json(rows);
  }
  if (req.method === 'POST') {
    const { title, category, target_date, target_value_num, target_value_text } = req.body ?? {};
    if (!title) return res.status(400).json({ error: 'title required' });
    const [inserted] = await db.insert(goals).values({
      user_id: userId, title,
      category: category ?? 'other',
      target_date: target_date ?? null,
      target_value_num: target_value_num ?? null,
      target_value_text: target_value_text ?? null,
      probability: 50,
    }).returning();
    return res.status(201).json(inserted);
  }
  if (req.method === 'PATCH') {
    const { id, ...updates } = req.body ?? {};
    if (!id) return res.status(400).json({ error: 'id required' });
    delete updates.user_id;
    updates.updated_at = new Date().toISOString();
    const [row] = await db.update(goals).set(updates).where(and(eq(goals.id, id), eq(goals.user_id, userId))).returning();
    return res.status(200).json(row);
  }
  if (req.method === 'DELETE') {
    const { id } = req.body ?? {};
    if (!id) return res.status(400).json({ error: 'id required' });
    await db.delete(goals).where(and(eq(goals.id, id), eq(goals.user_id, userId)));
    return res.status(200).json({ ok: true });
  }
  return res.status(405).json({ error: 'Method not allowed' });
};

// ── goal-actions ───────────────────────────────────────────
const handleGoalActions: Handler = async (req, res, userId) => {
  if (req.method === 'GET') {
    const rows = await db.select().from(goalActions).where(eq(goalActions.user_id, userId)).orderBy(desc(goalActions.action_at)).limit(500);
    return res.status(200).json(rows);
  }
  if (req.method === 'POST') {
    const { goal_id, delta, source, note } = req.body ?? {};
    if (!goal_id || typeof delta !== 'number') return res.status(400).json({ error: 'goal_id + delta required' });
    const [goal] = await db.select().from(goals).where(and(eq(goals.id, goal_id), eq(goals.user_id, userId))).limit(1);
    if (!goal) return res.status(404).json({ error: 'Goal not found' });
    const [inserted] = await db.insert(goalActions).values({ user_id: userId, goal_id, delta, source: source ?? null, note: note ?? null }).returning();
    const newProb = Math.max(0, Math.min(100, goal.probability + delta));
    await db.update(goals).set({ probability: newProb, updated_at: new Date().toISOString() }).where(eq(goals.id, goal_id));
    return res.status(201).json({ action: inserted, probability: newProb });
  }
  return res.status(405).json({ error: 'Method not allowed' });
};

// ── mana ───────────────────────────────────────────────────
async function upsertMana(userId: string, dailyMax?: number, delta?: number) {
  const d = today();
  const [existing] = await db.select().from(manaState).where(and(eq(manaState.user_id, userId), eq(manaState.date, d))).limit(1);
  if (!existing) {
    const max = dailyMax ?? 10;
    const [inserted] = await db.insert(manaState).values({ user_id: userId, date: d, daily_max: max, bank_remaining: max + (delta ?? 0) }).returning();
    return inserted;
  }
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (dailyMax !== undefined) { updates.daily_max = dailyMax; updates.bank_remaining = dailyMax; }
  if (delta !== undefined) updates.bank_remaining = Math.max(0, existing.bank_remaining + delta);
  const [row] = await db.update(manaState).set(updates).where(and(eq(manaState.user_id, userId), eq(manaState.date, d))).returning();
  return row;
}

const handleMana: Handler = async (req, res, userId) => {
  if (req.method === 'GET') return res.status(200).json(await upsertMana(userId));
  if (req.method === 'POST') {
    const { daily_max, delta } = req.body ?? {};
    return res.status(200).json(await upsertMana(userId, daily_max, delta));
  }
  return res.status(405).json({ error: 'Method not allowed' });
};

// ── router ─────────────────────────────────────────────────
const handlers: Record<string, Handler> = {
  'user-stats': handleUserStats,
  'quick-logs': handleQuickLogs,
  'weight-logs': handleWeightLogs,
  'urge-logs': handleUrgeLogs,
  'daily-checkins': handleDailyCheckins,
  'dev-logs': handleDevLogs,
  'weekly-reviews': handleWeeklyReviews,
  'food-items': handleFoodItems,
  'food-logs': handleFoodLogs,
  'goals': handleGoals,
  'goal-actions': handleGoalActions,
  'mana': handleMana,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const resource = typeof req.query.resource === 'string' ? req.query.resource : '';
  const fn = handlers[resource];
  if (!fn) return res.status(404).json({ error: `unknown resource "${resource}"` });

  const userId = await getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    await fn(req, res, userId);
  } catch (err) {
    console.error(`[${resource}]`, err);
    if (!res.writableEnded) res.status(500).json({ error: 'Internal error' });
  }
}
