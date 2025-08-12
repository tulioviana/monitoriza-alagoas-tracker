-- Create enum for transaction types
CREATE TYPE public.transaction_type AS ENUM ('purchase', 'consumption', 'admin_adjustment', 'refund', 'bonus');

-- Create user_credits table to track current balance
CREATE TABLE public.user_credits (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_balance INTEGER NOT NULL DEFAULT 0,
  total_purchased INTEGER NOT NULL DEFAULT 0,
  total_consumed INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id)
);

-- Create credit_transactions table for complete history
CREATE TABLE public.credit_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_type transaction_type NOT NULL,
  amount INTEGER NOT NULL,
  description TEXT,
  reference_id TEXT, -- For linking to search_history or other operations
  admin_user_id UUID REFERENCES auth.users(id), -- When admin makes adjustments
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  metadata JSONB
);

-- Enable RLS
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_credits
CREATE POLICY "Users can view their own credits"
ON public.user_credits
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own credits"
ON public.user_credits
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own credits"
ON public.user_credits
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all credits"
ON public.user_credits
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage all credits"
ON public.user_credits
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for credit_transactions
CREATE POLICY "Users can view their own transactions"
ON public.credit_transactions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can insert transactions"
ON public.credit_transactions
FOR INSERT
WITH CHECK (true); -- Allow system to insert, will be controlled by functions

CREATE POLICY "Admins can view all transactions"
ON public.credit_transactions
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage all transactions"
ON public.credit_transactions
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Function to consume credits safely
CREATE OR REPLACE FUNCTION public.consume_credit(
  p_user_id UUID,
  p_description TEXT DEFAULT 'Search operation',
  p_reference_id TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_credits INTEGER;
BEGIN
  -- Get current balance with row lock
  SELECT current_balance INTO current_credits
  FROM public.user_credits
  WHERE user_id = p_user_id
  FOR UPDATE;
  
  -- If no record exists, create one with 0 balance
  IF current_credits IS NULL THEN
    INSERT INTO public.user_credits (user_id, current_balance)
    VALUES (p_user_id, 0);
    current_credits := 0;
  END IF;
  
  -- Check if user has enough credits
  IF current_credits < 1 THEN
    RETURN FALSE;
  END IF;
  
  -- Consume credit
  UPDATE public.user_credits
  SET 
    current_balance = current_balance - 1,
    total_consumed = total_consumed + 1,
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  -- Record transaction
  INSERT INTO public.credit_transactions (
    user_id,
    transaction_type,
    amount,
    description,
    reference_id
  ) VALUES (
    p_user_id,
    'consumption',
    -1,
    p_description,
    p_reference_id
  );
  
  RETURN TRUE;
END;
$$;

-- Function to add credits
CREATE OR REPLACE FUNCTION public.add_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_transaction_type transaction_type DEFAULT 'purchase',
  p_description TEXT DEFAULT 'Credit addition',
  p_admin_user_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Insert or update user credits
  INSERT INTO public.user_credits (user_id, current_balance, total_purchased)
  VALUES (p_user_id, p_amount, CASE WHEN p_transaction_type = 'purchase' THEN p_amount ELSE 0 END)
  ON CONFLICT (user_id)
  DO UPDATE SET
    current_balance = user_credits.current_balance + p_amount,
    total_purchased = user_credits.total_purchased + CASE WHEN p_transaction_type = 'purchase' THEN p_amount ELSE 0 END,
    updated_at = NOW();
  
  -- Record transaction
  INSERT INTO public.credit_transactions (
    user_id,
    transaction_type,
    amount,
    description,
    admin_user_id
  ) VALUES (
    p_user_id,
    p_transaction_type,
    p_amount,
    p_description,
    p_admin_user_id
  );
  
  RETURN TRUE;
END;
$$;

-- Function to get user credit balance
CREATE OR REPLACE FUNCTION public.get_user_credits(p_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(current_balance, 0)
  FROM public.user_credits
  WHERE user_id = p_user_id;
$$;

-- Trigger to update updated_at on user_credits
CREATE TRIGGER update_user_credits_updated_at
  BEFORE UPDATE ON public.user_credits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_credit_transactions_user_id ON public.credit_transactions(user_id);
CREATE INDEX idx_credit_transactions_created_at ON public.credit_transactions(created_at DESC);
CREATE INDEX idx_credit_transactions_type ON public.credit_transactions(transaction_type);