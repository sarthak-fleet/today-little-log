-- Create emotions table for logging mood/emotions
CREATE TABLE public.emotions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  emotion TEXT NOT NULL,
  comment TEXT,
  logged_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.emotions ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own emotions" 
ON public.emotions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own emotions" 
ON public.emotions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own emotions" 
ON public.emotions 
FOR DELETE 
USING (auth.uid() = user_id);