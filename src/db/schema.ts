import { sqliteTable, text, integer, real, uniqueIndex } from 'drizzle-orm/sqlite-core';

// ── Better Auth tables ───────────────────────────────────────
export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('emailVerified', { mode: 'boolean' }).notNull().default(false),
  image: text('image'),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull(),
});

export const session = sqliteTable('session', {
  id: text('id').primaryKey(),
  expiresAt: integer('expiresAt', { mode: 'timestamp' }).notNull(),
  token: text('token').notNull().unique(),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
});

export const account = sqliteTable('account', {
  id: text('id').primaryKey(),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: integer('accessTokenExpiresAt', { mode: 'timestamp' }),
  refreshTokenExpiresAt: integer('refreshTokenExpiresAt', { mode: 'timestamp' }),
  scope: text('scope'),
  password: text('password'),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull(),
});

export const verification = sqliteTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: integer('expiresAt', { mode: 'timestamp' }).notNull(),
  createdAt: integer('createdAt', { mode: 'timestamp' }),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }),
});

// ── App tables ───────────────────────────────────────────────
const id = () => text('id').primaryKey().$defaultFn(() => crypto.randomUUID());
const userId = () => text('user_id').notNull();
const createdAt = () => text('created_at').notNull().$defaultFn(() => new Date().toISOString());
const updatedAt = () => text('updated_at').notNull().$defaultFn(() => new Date().toISOString());

export const profiles = sqliteTable('profiles', {
  id: id(),
  user_id: userId(),
  name: text('name'),
  avatar_url: text('avatar_url'),
  dob: text('dob'),
  // Highest-self identity statement shown at ShockCard + home.
  identity_statement: text('identity_statement'),
  // Sleep targets, "HH:MM" 24h.
  sleep_target_bed: text('sleep_target_bed'),
  sleep_target_wake: text('sleep_target_wake'),
  created_at: createdAt(),
  updated_at: updatedAt(),
}, (t) => [uniqueIndex('profiles_user_id_idx').on(t.user_id)]);

// ── Urgency / gamification tables ────────────────────────────

export const userStats = sqliteTable('user_stats', {
  id: id(),
  user_id: userId(),
  life_score: real('life_score').notNull().default(50),
  xp: integer('xp').notNull().default(0),
  last_activity_date: text('last_activity_date'),
  created_at: createdAt(),
  updated_at: updatedAt(),
}, (t) => [uniqueIndex('user_stats_user_id_idx').on(t.user_id)]);

export const quickLogs = sqliteTable('quick_logs', {
  id: id(),
  user_id: userId(),
  // 'water' | 'workout' | 'temptation' | 'win' | 'note'
  kind: text('kind').notNull(),
  value_num: real('value_num'),
  value_text: text('value_text'),
  logged_at: text('logged_at').notNull().$defaultFn(() => new Date().toISOString()),
  created_at: createdAt(),
});

export const weightLogs = sqliteTable('weight_logs', {
  id: id(),
  user_id: userId(),
  date: text('date').notNull(),
  kg: real('kg').notNull(),
  notes: text('notes'),
  created_at: createdAt(),
  updated_at: updatedAt(),
}, (t) => [uniqueIndex('weight_logs_user_date_idx').on(t.user_id, t.date)]);

export const urgeLogs = sqliteTable('urge_logs', {
  id: id(),
  user_id: userId(),
  // user-entered temptation e.g. "install random HN game"
  trigger: text('trigger').notNull(),
  reflection: text('reflection'),
  // 'cooldown' | 'resisted' | 'acted'
  status: text('status').notNull().default('cooldown'),
  logged_at: text('logged_at').notNull().$defaultFn(() => new Date().toISOString()),
  // 24h from logged_at
  expires_at: text('expires_at').notNull(),
  created_at: createdAt(),
  updated_at: updatedAt(),
});

// ── Ritual + goal tables ─────────────────────────────────────

export const dailyCheckins = sqliteTable('daily_checkins', {
  id: id(),
  user_id: userId(),
  date: text('date').notNull(),
  am_intents: text('am_intents', { mode: 'json' }).$type<string[]>(),
  am_regret: text('am_regret'),
  sleep_hours: real('sleep_hours'),
  psi_score: integer('psi_score'),
  pm_wins: text('pm_wins'),
  pm_wastes: text('pm_wastes'),
  pm_score: integer('pm_score'),
  hit: integer('hit', { mode: 'boolean' }).notNull().default(false),
  created_at: createdAt(),
  updated_at: updatedAt(),
}, (t) => [uniqueIndex('daily_checkins_user_date_idx').on(t.user_id, t.date)]);

export const devLogs = sqliteTable('dev_logs', {
  id: id(),
  user_id: userId(),
  date: text('date').notNull(),
  leetcode_count: integer('leetcode_count').notNull().default(0),
  deep_work_minutes: integer('deep_work_minutes').notNull().default(0),
  commits: integer('commits').notNull().default(0),
  summary: text('summary'),
  created_at: createdAt(),
  updated_at: updatedAt(),
}, (t) => [uniqueIndex('dev_logs_user_date_idx').on(t.user_id, t.date)]);

export const weeklyReviews = sqliteTable('weekly_reviews', {
  id: id(),
  user_id: userId(),
  week_start: text('week_start').notNull(),
  achieved: text('achieved'),
  gratitude: text('gratitude'),
  created_at: createdAt(),
  updated_at: updatedAt(),
}, (t) => [uniqueIndex('weekly_reviews_user_week_idx').on(t.user_id, t.week_start)]);

// ── Food + goals + mana tables ───────────────────────────────

export const foodItems = sqliteTable('food_items', {
  id: id(),
  user_id: userId(),
  name: text('name').notNull(),
  calories_per_serving: real('calories_per_serving').notNull(),
  protein_g: real('protein_g').notNull().default(0),
  carbs_g: real('carbs_g').notNull().default(0),
  fat_g: real('fat_g').notNull().default(0),
  unit: text('unit').notNull().default('serving'),
  created_at: createdAt(),
  updated_at: updatedAt(),
});

export const foodLogs = sqliteTable('food_logs', {
  id: id(),
  user_id: userId(),
  date: text('date').notNull(),
  food_item_id: text('food_item_id').notNull().references(() => foodItems.id, { onDelete: 'cascade' }),
  servings: real('servings').notNull().default(1),
  meal_type: text('meal_type'),
  created_at: createdAt(),
});

export const goals = sqliteTable('goals', {
  id: id(),
  user_id: userId(),
  title: text('title').notNull(),
  category: text('category').notNull().default('other'),
  target_date: text('target_date'),
  target_value_num: real('target_value_num'),
  target_value_text: text('target_value_text'),
  probability: real('probability').notNull().default(50),
  created_at: createdAt(),
  updated_at: updatedAt(),
});

export const goalActions = sqliteTable('goal_actions', {
  id: id(),
  user_id: userId(),
  goal_id: text('goal_id').notNull().references(() => goals.id, { onDelete: 'cascade' }),
  action_at: text('action_at').notNull().$defaultFn(() => new Date().toISOString()),
  delta: real('delta').notNull().default(0),
  source: text('source'),
  note: text('note'),
  created_at: createdAt(),
});

export const manaState = sqliteTable('mana_state', {
  id: id(),
  user_id: userId(),
  date: text('date').notNull(),
  daily_max: integer('daily_max').notNull().default(10),
  bank_remaining: integer('bank_remaining').notNull().default(10),
  created_at: createdAt(),
  updated_at: updatedAt(),
}, (t) => [uniqueIndex('mana_state_user_date_idx').on(t.user_id, t.date)]);

export const projects = sqliteTable('projects', {
  id: id(),
  user_id: userId(),
  title: text('title').notNull(),
  description: text('description'),
  color: text('color'),
  created_at: createdAt(),
  updated_at: updatedAt(),
});

export const tasks = sqliteTable('tasks', {
  id: id(),
  user_id: userId(),
  title: text('title').notNull(),
  notes: text('notes'),
  estimate_minutes: integer('estimate_minutes'),
  status: text('status').notNull().default('todo'),
  sort_order: integer('sort_order').notNull().default(0),
  project_id: text('project_id').references(() => projects.id),
  // Eisenhower: 'q1' urgent+important, 'q2' important-not-urgent,
  // 'q3' urgent-not-important, 'q4' neither.
  quadrant: text('quadrant'),
  mana_cost: integer('mana_cost'),
  created_at: createdAt(),
  updated_at: updatedAt(),
});

export const habits = sqliteTable('habits', {
  id: id(),
  user_id: userId(),
  title: text('title').notNull(),
  target_type: text('target_type').notNull().default('target'),
  track_type: text('track_type').notNull().default('count'),
  frequency: text('frequency').notNull().default('daily'),
  target_value: real('target_value').notNull().default(1),
  project_id: text('project_id').references(() => projects.id),
  created_at: createdAt(),
  updated_at: updatedAt(),
});

export const habitLogs = sqliteTable('habit_logs', {
  id: id(),
  user_id: userId(),
  habit_id: text('habit_id').notNull().references(() => habits.id, { onDelete: 'cascade' }),
  date: text('date').notNull(),
  value: real('value').notNull().default(0),
  created_at: createdAt(),
  updated_at: updatedAt(),
}, (t) => [uniqueIndex('habit_logs_habit_date_idx').on(t.habit_id, t.date)]);

export const emotions = sqliteTable('emotions', {
  id: id(),
  user_id: userId(),
  emotion: text('emotion').notNull(),
  comment: text('comment'),
  logged_at: text('logged_at').notNull().$defaultFn(() => new Date().toISOString()),
  created_at: createdAt(),
});

export const journalEntries = sqliteTable('journal_entries', {
  id: id(),
  user_id: userId(),
  date: text('date').notNull(),
  content: text('content').notNull().default(''),
  entry_type: text('entry_type').notNull().default('daily'),
  created_at: createdAt(),
  updated_at: updatedAt(),
});

export const lifeRules = sqliteTable('life_rules', {
  id: id(),
  user_id: userId(),
  content: text('content').notNull(),
  position: integer('position').notNull().default(0),
  created_at: createdAt(),
  updated_at: updatedAt(),
});

export const schedules = sqliteTable('schedules', {
  id: id(),
  user_id: userId(),
  blocks: text('blocks', { mode: 'json' }).notNull().$type<unknown[]>().default([]),
  created_at: createdAt(),
  updated_at: updatedAt(),
}, (t) => [uniqueIndex('schedules_user_id_idx').on(t.user_id)]);

export const timeSessions = sqliteTable('time_sessions', {
  id: id(),
  user_id: userId(),
  reference_id: text('reference_id').notNull(),
  reference_type: text('reference_type').notNull(),
  started_at: text('started_at').notNull(),
  ended_at: text('ended_at'),
  duration_seconds: integer('duration_seconds').notNull().default(0),
  notes: text('notes'),
  project_id: text('project_id').references(() => projects.id),
  created_at: createdAt(),
});

// ── Daily scoreboard ─────────────────────────────────────────
// User-defined daily checks/outputs. Drives the no-zero-day streak.
export const scoreboardItems = sqliteTable('scoreboard_items', {
  id: id(),
  user_id: userId(),
  label: text('label').notNull(),
  // 'score' = numeric daily score against max_score. Legacy rows may still hold check/output.
  kind: text('kind').notNull().default('score'),
  score_month: text('score_month').notNull().default(''),
  source_key: text('source_key'),
  min_score: integer('min_score').notNull().default(0),
  max_score: integer('max_score').notNull().default(1),
  ideal_score: integer('ideal_score').notNull().default(1),
  criteria: text('criteria'),
  position: integer('position').notNull().default(0),
  archived: integer('archived', { mode: 'boolean' }).notNull().default(false),
  created_at: createdAt(),
  updated_at: updatedAt(),
});

export const scoreboardLogs = sqliteTable('scoreboard_logs', {
  id: id(),
  user_id: userId(),
  item_id: text('item_id').notNull().references(() => scoreboardItems.id, { onDelete: 'cascade' }),
  date: text('date').notNull(),
  value_bool: integer('value_bool', { mode: 'boolean' }).notNull().default(false),
  value_score: integer('value_score'),
  value_text: text('value_text'),
  created_at: createdAt(),
  updated_at: updatedAt(),
}, (t) => [uniqueIndex('scoreboard_logs_item_date_idx').on(t.item_id, t.date)]);

export const scoreboardDayNotes = sqliteTable('scoreboard_day_notes', {
  id: id(),
  user_id: userId(),
  score_month: text('score_month').notNull(),
  date: text('date').notNull(),
  low_score_reason: text('low_score_reason'),
  created_at: createdAt(),
  updated_at: updatedAt(),
}, (t) => [uniqueIndex('scoreboard_day_notes_user_date_idx').on(t.user_id, t.date)]);

export const scoreboardMonthLocks = sqliteTable('scoreboard_month_locks', {
  id: id(),
  user_id: userId(),
  score_month: text('score_month').notNull(),
  locked_at: text('locked_at').notNull().$defaultFn(() => new Date().toISOString()),
  created_at: createdAt(),
}, (t) => [uniqueIndex('scoreboard_month_locks_user_month_idx').on(t.user_id, t.score_month)]);
