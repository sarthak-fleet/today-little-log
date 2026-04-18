-- Wave A: LifeScore, Identity, Quick-log, Weight, URGE.
-- Apply via: `turso db shell $TURSO_DB_NAME < drizzle/migrations/0001_urgency_wave_a.sql`
-- or paste into Drizzle Studio.

-- Profiles: add identity + sleep targets.
ALTER TABLE profiles ADD COLUMN identity_statement TEXT;
ALTER TABLE profiles ADD COLUMN sleep_target_bed TEXT;
ALTER TABLE profiles ADD COLUMN sleep_target_wake TEXT;

-- LifeScore + XP bank, one row per user.
CREATE TABLE user_stats (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  life_score REAL NOT NULL DEFAULT 50,
  xp INTEGER NOT NULL DEFAULT 0,
  last_activity_date TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX user_stats_user_id_idx ON user_stats (user_id);

-- Quick logs: water / workout / temptation / win / note.
CREATE TABLE quick_logs (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  value_num REAL,
  value_text TEXT,
  logged_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX quick_logs_user_logged_idx ON quick_logs (user_id, logged_at);

-- Weight trajectory.
CREATE TABLE weight_logs (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  date TEXT NOT NULL,
  kg REAL NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX weight_logs_user_date_idx ON weight_logs (user_id, date);

-- URGE button: novelty-trap defuser.
CREATE TABLE urge_logs (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  trigger TEXT NOT NULL,
  reflection TEXT,
  status TEXT NOT NULL DEFAULT 'cooldown',
  logged_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX urge_logs_user_logged_idx ON urge_logs (user_id, logged_at);
