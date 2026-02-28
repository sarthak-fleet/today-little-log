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
  created_at: createdAt(),
  updated_at: updatedAt(),
}, (t) => [uniqueIndex('profiles_user_id_idx').on(t.user_id)]);

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
