-- Create enum for user plans
CREATE TYPE public.user_plan AS ENUM ('lite', 'pro');

-- Add plan column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN plan public.user_plan NOT NULL DEFAULT 'lite';