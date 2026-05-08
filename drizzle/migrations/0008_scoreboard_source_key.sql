-- Stable key for code-configured monthly scoreboard items.

ALTER TABLE scoreboard_items ADD COLUMN source_key TEXT;
CREATE UNIQUE INDEX scoreboard_items_user_month_source_key_idx
  ON scoreboard_items (user_id, score_month, source_key)
  WHERE source_key IS NOT NULL;
