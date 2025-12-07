-- Create a table for life rules
CREATE TABLE public.life_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.life_rules ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own rules" 
ON public.life_rules 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own rules" 
ON public.life_rules 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own rules" 
ON public.life_rules 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own rules" 
ON public.life_rules 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_life_rules_updated_at
BEFORE UPDATE ON public.life_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();