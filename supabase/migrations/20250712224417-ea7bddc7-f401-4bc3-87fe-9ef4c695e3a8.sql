-- Create sequence first
CREATE SEQUENCE IF NOT EXISTS competitor_tracking_id_seq;

-- Create competitor_tracking table for CNPJ monitoring
CREATE TABLE public.competitor_tracking (
  id BIGINT NOT NULL DEFAULT nextval('competitor_tracking_id_seq'::regclass) PRIMARY KEY,
  user_id UUID NOT NULL,
  competitor_cnpj VARCHAR(14) NOT NULL,
  competitor_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.competitor_tracking ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own competitor tracking" 
ON public.competitor_tracking 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own competitor tracking" 
ON public.competitor_tracking 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own competitor tracking" 
ON public.competitor_tracking 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own competitor tracking" 
ON public.competitor_tracking 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_competitor_tracking_updated_at
BEFORE UPDATE ON public.competitor_tracking
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for better performance
CREATE INDEX idx_competitor_tracking_user_id ON public.competitor_tracking(user_id);
CREATE INDEX idx_competitor_tracking_cnpj ON public.competitor_tracking(competitor_cnpj);