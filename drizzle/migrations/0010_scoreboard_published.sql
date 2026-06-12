-- Publish state for the monthly scoreboard.
--
-- Two-stage lock:
--   published_at — config (row list / max scores / rules) frozen,
--                  logging stays open until end of month.
--   locked_at    — end-of-month finalize: everything frozen.
-- The two fields are independent; a row can have either or both set.
--
-- locked_at was previously NOT NULL because it doubled as the row's
-- own creation timestamp for finalize. With publish added we need
-- rows that have only published_at set, so locked_at becomes
-- nullable via SQLite's table-rebuild pattern. Existing rows keep
-- their locked_at value (they all represent past finalizes).

CREATE TABLE scoreboard_month_locks_new (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  score_month TEXT NOT NULL,
  locked_at TEXT,
  published_at TEXT,
  created_at TEXT NOT NULL
);

INSERT INTO scoreboard_month_locks_new (id, user_id, score_month, locked_at, published_at, created_at)
SELECT id, user_id, score_month, locked_at, NULL, created_at FROM scoreboard_month_locks;

DROP TABLE scoreboard_month_locks;
ALTER TABLE scoreboard_month_locks_new RENAME TO scoreboard_month_locks;

CREATE UNIQUE INDEX scoreboard_month_locks_user_month_idx
  ON scoreboard_month_locks (user_id, score_month);
