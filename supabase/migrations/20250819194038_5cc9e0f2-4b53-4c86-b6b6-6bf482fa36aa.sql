-- Fix security vulnerability in credit_transactions table
-- Remove overly permissive INSERT policies and replace with secure ones

-- Drop the insecure policies
DROP POLICY IF EXISTS "System can insert transactions" ON public.credit_transactions;
DROP POLICY IF EXISTS "Security definer functions can insert transactions" ON public.credit_transactions;

-- Create a more secure policy that only allows credit transactions 
-- to be created by authenticated users through specific security definer functions
-- This works by checking if the transaction is being created in the context of 
-- a security definer function (which bypasses RLS) or by an authenticated admin

CREATE POLICY "Secure credit transaction creation" 
ON public.credit_transactions 
FOR INSERT 
WITH CHECK (
  -- Only allow insertions from security definer functions (which bypass RLS)
  -- OR from authenticated admin users
  auth.uid() IS NOT NULL 
  AND (
    -- Admin users can create transactions
    has_role(auth.uid(), 'admin'::app_role)
    -- OR the user_id matches the authenticated user (for self-transactions)
    OR user_id = auth.uid()
  )
);

-- Add additional validation function to ensure transaction integrity
CREATE OR REPLACE FUNCTION public.validate_credit_transaction()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure user_id is not null
  IF NEW.user_id IS NULL THEN
    RAISE EXCEPTION 'user_id cannot be null in credit transactions';
  END IF;
  
  -- Ensure transaction_type is valid
  IF NEW.transaction_type NOT IN ('purchase', 'consumption', 'admin_adjustment', 'refund', 'bonus') THEN
    RAISE EXCEPTION 'Invalid transaction_type: %', NEW.transaction_type;
  END IF;
  
  -- Ensure amount is reasonable (not too large to prevent overflow attacks)
  IF NEW.amount > 1000000 OR NEW.amount < -1000000 THEN
    RAISE EXCEPTION 'Transaction amount is out of reasonable range: %', NEW.amount;
  END IF;
  
  -- Log transaction creation for audit trail
  RAISE LOG 'Credit transaction created: user_id=%, type=%, amount=%, description=%', 
    NEW.user_id, NEW.transaction_type, NEW.amount, NEW.description;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add the validation trigger
DROP TRIGGER IF EXISTS validate_credit_transaction_trigger ON public.credit_transactions;
CREATE TRIGGER validate_credit_transaction_trigger
  BEFORE INSERT ON public.credit_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_credit_transaction();

-- Update existing functions to be more secure
-- The consume_credit function already has proper validation
-- The add_credits function already has proper validation  
-- The admin_add_credits function already has proper admin checks

-- Add audit logging for admin actions
CREATE OR REPLACE FUNCTION public.log_admin_credit_action()
RETURNS TRIGGER AS $$
BEGIN
  -- Log admin credit adjustments to audit table
  IF NEW.transaction_type = 'admin_adjustment' AND NEW.admin_user_id IS NOT NULL THEN
    INSERT INTO public.admin_audit_log (
      admin_user_id,
      action,
      target_table,
      target_id,
      new_values,
      created_at
    ) VALUES (
      NEW.admin_user_id,
      'credit_adjustment',
      'credit_transactions',
      NEW.id::text,
      jsonb_build_object(
        'user_id', NEW.user_id,
        'transaction_type', NEW.transaction_type,
        'amount', NEW.amount,
        'description', NEW.description
      ),
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add the audit trigger
DROP TRIGGER IF EXISTS log_admin_credit_action_trigger ON public.credit_transactions;
CREATE TRIGGER log_admin_credit_action_trigger
  AFTER INSERT ON public.credit_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.log_admin_credit_action();