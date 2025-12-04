-- Add entry_type column to journal_entries
ALTER TABLE public.journal_entries 
ADD COLUMN entry_type text NOT NULL DEFAULT 'daily' 
CHECK (entry_type IN ('daily', 'weekly', 'monthly'));