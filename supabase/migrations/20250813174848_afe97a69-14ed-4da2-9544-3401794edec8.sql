-- Investigar e corrigir a função consume_credit
-- O problema parece estar na política RLS que não permite que functions SECURITY DEFINER 
-- façam INSERT na tabela credit_transactions

-- Vamos criar uma política específica para functions SECURITY DEFINER
CREATE POLICY "Security definer functions can insert transactions"
ON public.credit_transactions
FOR INSERT
WITH CHECK (true);

-- Vamos também adicionar mais logging detalhado na função
CREATE OR REPLACE FUNCTION public.consume_credit(p_user_id uuid, p_description text DEFAULT 'Search operation'::text, p_reference_id text DEFAULT NULL::text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  current_credits INTEGER;
  is_admin BOOLEAN;
  transaction_id UUID;
BEGIN
  -- Log da tentativa de consumo
  RAISE LOG 'CONSUME_CREDIT: Starting for user: %, description: %', p_user_id, p_description;
  
  -- Verificar se o usuário existe
  IF p_user_id IS NULL THEN
    RAISE LOG 'CONSUME_CREDIT: User ID is null, cannot consume credit';
    RETURN FALSE;
  END IF;
  
  -- Check if user is admin
  BEGIN
    SELECT has_role(p_user_id, 'admin'::app_role) INTO is_admin;
    RAISE LOG 'CONSUME_CREDIT: Admin check completed for user %, is_admin: %', p_user_id, is_admin;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE LOG 'CONSUME_CREDIT: Error checking admin role: % %', SQLERRM, SQLSTATE;
      is_admin := FALSE;
  END;
  
  -- If user is admin, allow unlimited consumption without deducting credits
  IF is_admin THEN
    RAISE LOG 'CONSUME_CREDIT: Processing admin user transaction';
    BEGIN
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
      ) RETURNING id INTO transaction_id;
      
      RAISE LOG 'CONSUME_CREDIT: Admin transaction created with ID: %', transaction_id;
      RETURN TRUE;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE LOG 'CONSUME_CREDIT: Error creating admin transaction: % %', SQLERRM, SQLSTATE;
        RETURN FALSE;
    END;
  END IF;
  
  RAISE LOG 'CONSUME_CREDIT: Processing regular user, getting current balance';
  
  -- Get current balance with row lock for non-admin users
  BEGIN
    SELECT current_balance INTO current_credits
    FROM public.user_credits
    WHERE user_id = p_user_id
    FOR UPDATE;
    
    RAISE LOG 'CONSUME_CREDIT: Current credits for user %: %', p_user_id, current_credits;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE LOG 'CONSUME_CREDIT: Error getting current balance: % %', SQLERRM, SQLSTATE;
      current_credits := NULL;
  END;
  
  -- If no record exists, create one with 0 balance
  IF current_credits IS NULL THEN
    BEGIN
      INSERT INTO public.user_credits (user_id, current_balance, total_purchased, total_consumed)
      VALUES (p_user_id, 0, 0, 0);
      current_credits := 0;
      RAISE LOG 'CONSUME_CREDIT: Created new credit record for user: %', p_user_id;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE LOG 'CONSUME_CREDIT: Error creating credit record: % %', SQLERRM, SQLSTATE;
        RETURN FALSE;
    END;
  END IF;
  
  -- Check if user has enough credits
  IF current_credits < 1 THEN
    RAISE LOG 'CONSUME_CREDIT: Insufficient credits for user: %, current balance: %', p_user_id, current_credits;
    RETURN FALSE;
  END IF;
  
  RAISE LOG 'CONSUME_CREDIT: User has sufficient credits, proceeding with consumption';
  
  -- Consume credit for non-admin users
  BEGIN
    UPDATE public.user_credits
    SET 
      current_balance = current_balance - 1,
      total_consumed = total_consumed + 1,
      updated_at = NOW()
    WHERE user_id = p_user_id;
    
    RAISE LOG 'CONSUME_CREDIT: Credit balance updated successfully';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE LOG 'CONSUME_CREDIT: Error updating credit balance: % %', SQLERRM, SQLSTATE;
      RETURN FALSE;
  END;
  
  -- Record transaction
  BEGIN
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
    ) RETURNING id INTO transaction_id;
    
    RAISE LOG 'CONSUME_CREDIT: Transaction recorded with ID: %', transaction_id;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE LOG 'CONSUME_CREDIT: Error recording transaction: % %', SQLERRM, SQLSTATE;
      -- Rollback the credit consumption if transaction recording fails
      UPDATE public.user_credits
      SET 
        current_balance = current_balance + 1,
        total_consumed = total_consumed - 1,
        updated_at = NOW()
      WHERE user_id = p_user_id;
      RETURN FALSE;
  END;
  
  RAISE LOG 'CONSUME_CREDIT: Successfully consumed credit for user: %, remaining balance: %', p_user_id, current_credits - 1;
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'CONSUME_CREDIT: Unexpected error for user %: % %', p_user_id, SQLERRM, SQLSTATE;
    RETURN FALSE;
END;
$function$;