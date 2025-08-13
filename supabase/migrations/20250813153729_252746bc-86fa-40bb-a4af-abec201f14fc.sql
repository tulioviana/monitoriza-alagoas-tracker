-- Corrigir e melhorar a função consume_credit
CREATE OR REPLACE FUNCTION public.consume_credit(
  p_user_id uuid, 
  p_description text DEFAULT 'Search operation'::text, 
  p_reference_id text DEFAULT NULL::text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  current_credits INTEGER;
  is_admin BOOLEAN;
BEGIN
  -- Log da tentativa de consumo
  RAISE LOG 'Attempting to consume credit for user: %, description: %', p_user_id, p_description;
  
  -- Verificar se o usuário existe
  IF p_user_id IS NULL THEN
    RAISE LOG 'User ID is null, cannot consume credit';
    RETURN FALSE;
  END IF;
  
  -- Check if user is admin
  SELECT has_role(p_user_id, 'admin'::app_role) INTO is_admin;
  
  -- If user is admin, allow unlimited consumption without deducting credits
  IF is_admin THEN
    -- Still record the transaction for audit purposes but don't deduct credits
    INSERT INTO public.credit_transactions (
      user_id,
      transaction_type,
      amount,
      description,
      reference_id
    ) VALUES (
      p_user_id,
      'consumption',
      0, -- Zero amount for admin consumption
      p_description || ' (Admin - Unlimited)',
      p_reference_id
    );
    
    RAISE LOG 'Credit consumed by admin user: %', p_user_id;
    RETURN TRUE;
  END IF;
  
  -- Get current balance with row lock for non-admin users
  SELECT current_balance INTO current_credits
  FROM public.user_credits
  WHERE user_id = p_user_id
  FOR UPDATE;
  
  -- If no record exists, create one with 0 balance
  IF current_credits IS NULL THEN
    INSERT INTO public.user_credits (user_id, current_balance, total_purchased, total_consumed)
    VALUES (p_user_id, 0, 0, 0);
    current_credits := 0;
    RAISE LOG 'Created new credit record for user: %', p_user_id;
  END IF;
  
  -- Check if user has enough credits
  IF current_credits < 1 THEN
    RAISE LOG 'Insufficient credits for user: %, current balance: %', p_user_id, current_credits;
    RETURN FALSE;
  END IF;
  
  -- Consume credit for non-admin users
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
  
  RAISE LOG 'Credit consumed successfully for user: %, remaining balance: %', p_user_id, current_credits - 1;
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in consume_credit for user %: % %', p_user_id, SQLERRM, SQLSTATE;
    RETURN FALSE;
END;
$$;

-- Criar função para adicionar créditos via interface admin
CREATE OR REPLACE FUNCTION public.admin_add_credits(
  p_target_user_id uuid,
  p_amount integer,
  p_description text DEFAULT 'Admin credit addition'::text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Verificar se o usuário atual é admin
  admin_user_id := auth.uid();
  
  IF NOT has_role(admin_user_id, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;
  
  -- Validar parâmetros
  IF p_target_user_id IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Invalid parameters: user_id and amount must be valid';
  END IF;
  
  -- Usar a função existente add_credits
  RETURN add_credits(
    p_target_user_id,
    p_amount,
    'admin_adjustment'::transaction_type,
    p_description,
    admin_user_id
  );
END;
$$;