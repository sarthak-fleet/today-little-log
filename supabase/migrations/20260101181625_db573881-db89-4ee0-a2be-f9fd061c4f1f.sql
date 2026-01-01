-- Create habits table
CREATE TABLE public.habits (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    title TEXT NOT NULL,
    target_type TEXT NOT NULL DEFAULT 'target', -- 'target' or 'limit'
    track_type TEXT NOT NULL DEFAULT 'count', -- 'count' or 'time'
    frequency TEXT NOT NULL DEFAULT 'daily', -- 'daily' or 'weekly'
    target_value INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create habit_logs table for tracking progress
CREATE TABLE public.habit_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    habit_id UUID NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    value INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(habit_id, date)
);

-- Enable RLS
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_logs ENABLE ROW LEVEL SECURITY;

-- Habits RLS policies
CREATE POLICY "Users can view their own habits" 
ON public.habits FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own habits" 
ON public.habits FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own habits" 
ON public.habits FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own habits" 
ON public.habits FOR DELETE 
USING (auth.uid() = user_id);

-- Habit logs RLS policies
CREATE POLICY "Users can view their own habit logs" 
ON public.habit_logs FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own habit logs" 
ON public.habit_logs FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own habit logs" 
ON public.habit_logs FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own habit logs" 
ON public.habit_logs FOR DELETE 
USING (auth.uid() = user_id);

-- Add update triggers
CREATE TRIGGER update_habits_updated_at
BEFORE UPDATE ON public.habits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_habit_logs_updated_at
BEFORE UPDATE ON public.habit_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();