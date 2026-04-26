-- Daily scoreboard: user-defined check/output items + per-day logs.
-- Drives the no-zero-day streak.

CREATE TABLE scoreboard_items (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  label TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'check',
  position INTEGER NOT NULL DEFAULT 0,
  archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX scoreboard_items_user_idx ON scoreboard_items (user_id, archived, position);

CREATE TABLE scoreboard_logs (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  item_id TEXT NOT NULL REFERENCES scoreboard_items(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  value_bool INTEGER NOT NULL DEFAULT 0,
  value_text TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX scoreboard_logs_item_date_idx ON scoreboard_logs (item_id, date);
CREATE INDEX scoreboard_logs_user_date_idx ON scoreboard_logs (user_id, date);
