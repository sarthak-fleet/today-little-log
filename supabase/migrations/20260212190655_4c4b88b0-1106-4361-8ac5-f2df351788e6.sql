
ALTER TABLE public.tasks ADD COLUMN sort_order integer NOT NULL DEFAULT 0;

-- Set initial sort_order based on created_at
UPDATE public.tasks SET sort_order = sub.rn FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) AS rn FROM public.tasks
) sub WHERE tasks.id = sub.id;
