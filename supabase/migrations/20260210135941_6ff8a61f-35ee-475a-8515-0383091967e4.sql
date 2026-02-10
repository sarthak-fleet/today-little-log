-- Convert legacy plain-text journal entries to JSON with "general" key
UPDATE journal_entries
SET content = jsonb_build_object('general', content)::text
WHERE content NOT LIKE '{%';