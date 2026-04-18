-- Wave B: Eisenhower quadrants, mana cost, AM/PM ritual, dev rituals, weekly reviews.

-- Tasks: Eisenhower quadrant + mana cost
ALTER TABLE tasks ADD COLUMN quadrant TEXT;
ALTER TABLE tasks ADD COLUMN mana_cost INTEGER;

-- Daily check-ins: AM intents + PM review + sleep + psi.
CREATE TABLE daily_checkins (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  date TEXT NOT NULL,
  am_intents TEXT,
  am_regret TEXT,
  sleep_hours REAL,
  psi_score INTEGER,
  pm_wins TEXT,
  pm_wastes TEXT,
  pm_score INTEGER,
  hit INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX daily_checkins_user_date_idx ON daily_checkins (user_id, date);

-- Dev rituals: per-day LeetCode, deep-work minutes, commits.
CREATE TABLE dev_logs (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  date TEXT NOT NULL,
  leetcode_count INTEGER NOT NULL DEFAULT 0,
  deep_work_minutes INTEGER NOT NULL DEFAULT 0,
  commits INTEGER NOT NULL DEFAULT 0,
  summary TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX dev_logs_user_date_idx ON dev_logs (user_id, date);

-- Weekly review: achievements + gratitude.
CREATE TABLE weekly_reviews (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  week_start TEXT NOT NULL,
  achieved TEXT,
  gratitude TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX weekly_reviews_user_week_idx ON weekly_reviews (user_id, week_start);
