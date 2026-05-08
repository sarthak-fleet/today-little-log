-- Irreversible monthly score locks.

CREATE TABLE scoreboard_month_locks (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  score_month TEXT NOT NULL,
  locked_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE UNIQUE INDEX scoreboard_month_locks_user_month_idx
  ON scoreboard_month_locks (user_id, score_month);
