-- Monthly score monitor: task criteria + numeric daily scores.

ALTER TABLE scoreboard_items ADD COLUMN score_month TEXT NOT NULL DEFAULT '';
ALTER TABLE scoreboard_items ADD COLUMN max_score INTEGER NOT NULL DEFAULT 1;
ALTER TABLE scoreboard_items ADD COLUMN criteria TEXT;

ALTER TABLE scoreboard_logs ADD COLUMN value_score INTEGER;

CREATE INDEX scoreboard_items_user_month_idx ON scoreboard_items (user_id, score_month, archived, position);
