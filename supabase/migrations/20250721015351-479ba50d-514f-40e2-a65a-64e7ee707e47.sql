-- Create competitor_price_history table for storing competitor price data
CREATE TABLE public.competitor_price_history (
  id BIGINT NOT NULL DEFAULT nextval('competitor_price_history_id_seq'::regclass) PRIMARY KEY,
  competitor_tracking_id BIGINT NOT NULL,
  product_description TEXT NOT NULL,
  product_ean TEXT,
  establishment_cnpj VARCHAR(14) NOT NULL,
  sale_date TIMESTAMP WITH TIME ZONE NOT NULL,
  declared_price NUMERIC,
  sale_price NUMERIC NOT NULL,
  fetch_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sequence for competitor_price_history
CREATE SEQUENCE IF NOT EXISTS competitor_price_history_id_seq;

-- Enable RLS
ALTER TABLE public.competitor_price_history ENABLE ROW LEVEL SECURITY;

-- Create policies for competitor price history
CREATE POLICY "Users can view competitor price history of own tracked competitors" 
ON public.competitor_price_history 
FOR SELECT 
USING (EXISTS (
  SELECT 1 
  FROM competitor_tracking 
  WHERE competitor_tracking.id = competitor_price_history.competitor_tracking_id 
  AND competitor_tracking.user_id = auth.uid()
));

-- Create index for better performance
CREATE INDEX idx_competitor_price_history_competitor_id ON public.competitor_price_history(competitor_tracking_id);
CREATE INDEX idx_competitor_price_history_establishment_cnpj ON public.competitor_price_history(establishment_cnpj);
CREATE INDEX idx_competitor_price_history_fetch_date ON public.competitor_price_history(fetch_date);

-- Create foreign key relationship
ALTER TABLE public.competitor_price_history 
ADD CONSTRAINT fk_competitor_price_history_competitor_tracking 
FOREIGN KEY (competitor_tracking_id) REFERENCES public.competitor_tracking(id) ON DELETE CASCADE;