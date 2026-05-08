-- Daily score explanation: why a day scored low.

CREATE TABLE scoreboard_day_notes (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  score_month TEXT NOT NULL,
  date TEXT NOT NULL,
  low_score_reason TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX scoreboard_day_notes_user_date_idx
  ON scoreboard_day_notes (user_id, date);

CREATE INDEX scoreboard_day_notes_user_month_idx
  ON scoreboard_day_notes (user_id, score_month, date);
