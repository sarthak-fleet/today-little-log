-- Score bounds for ideal-vs-excellent scoring and negative penalty rows.

ALTER TABLE scoreboard_items ADD COLUMN min_score INTEGER NOT NULL DEFAULT 0;
ALTER TABLE scoreboard_items ADD COLUMN ideal_score INTEGER NOT NULL DEFAULT 1;
