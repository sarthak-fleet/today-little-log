-- Drop any existing unique constraint on user_id, date if it exists
DO $$ 
BEGIN
  -- Try to drop the constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'journal_entries_user_id_date_key' 
    AND conrelid = 'public.journal_entries'::regclass
  ) THEN
    ALTER TABLE public.journal_entries DROP CONSTRAINT journal_entries_user_id_date_key;
  END IF;
END $$;

-- Add a composite unique constraint on user_id, date, and entry_type
ALTER TABLE public.journal_entries 
ADD CONSTRAINT journal_entries_user_id_date_entry_type_key 
UNIQUE (user_id, date, entry_type);