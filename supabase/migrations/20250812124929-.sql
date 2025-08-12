-- Update consume_credit function to bypass credit consumption for admins
CREATE OR REPLACE FUNCTION public.consume_credit(p_user_id uuid, p_description text DEFAULT 'Search operation'::text, p_reference_id text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  current_credits INTEGER;
  is_admin BOOLEAN;
BEGIN
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
    
    RETURN TRUE;
  END IF;
  
  -- Get current balance with row lock for non-admin users
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
  
  RETURN TRUE;
END;
$function$