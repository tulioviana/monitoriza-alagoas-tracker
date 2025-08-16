-- Create function to get user plan
CREATE OR REPLACE FUNCTION public.get_user_plan(p_user_id uuid)
RETURNS public.user_plan
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT COALESCE(plan, 'lite'::public.user_plan)
  FROM public.profiles
  WHERE id = p_user_id;
$$;

-- Create function to check if user has pro plan
CREATE OR REPLACE FUNCTION public.has_pro_plan(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT COALESCE(plan = 'pro'::public.user_plan, false)
  FROM public.profiles
  WHERE id = p_user_id;
$$;