-- Create enum for user plans
CREATE TYPE public.user_plan AS ENUM ('lite', 'pro');

-- Add plan column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN plan public.user_plan NOT NULL DEFAULT 'lite';

-- Create function to get user plan
CREATE OR REPLACE FUNCTION public.get_user_plan(p_user_id uuid)
RETURNS public.user_plan
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT COALESCE(plan, 'lite'::user_plan)
  FROM public.profiles
  WHERE id = p_user_id;
$function$

-- Create function to check if user has pro plan
CREATE OR REPLACE FUNCTION public.has_pro_plan(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT COALESCE(plan = 'pro'::user_plan, false)
  FROM public.profiles
  WHERE id = p_user_id;
$function$