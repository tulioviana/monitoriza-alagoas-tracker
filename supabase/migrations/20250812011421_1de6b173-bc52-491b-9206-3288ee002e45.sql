-- Create enum for roles
CREATE TYPE public.app_role AS ENUM ('super_admin', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY CASE 
    WHEN role = 'super_admin' THEN 1
    WHEN role = 'user' THEN 2
  END
  LIMIT 1
$$;

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own role"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Super admins can view all roles"
ON public.user_roles
FOR SELECT
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can manage all roles"
ON public.user_roles
FOR ALL
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Insert super admin role for tuliomv7@gmail.com
-- First, we need to get the user_id from auth.users, but we can't query it directly
-- So we'll create a function to do this safely
CREATE OR REPLACE FUNCTION public.assign_super_admin_role()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    target_user_id UUID;
BEGIN
    -- Get user ID for tuliomv7@gmail.com from profiles table
    SELECT id INTO target_user_id
    FROM public.profiles
    WHERE id IN (
        SELECT id FROM auth.users WHERE email = 'tuliomv7@gmail.com'
    )
    LIMIT 1;
    
    IF target_user_id IS NOT NULL THEN
        -- Insert super_admin role
        INSERT INTO public.user_roles (user_id, role)
        VALUES (target_user_id, 'super_admin')
        ON CONFLICT (user_id, role) DO NOTHING;
        
        RAISE LOG 'Super admin role assigned to user: %', target_user_id;
    ELSE
        RAISE LOG 'User tuliomv7@gmail.com not found in profiles';
    END IF;
END;
$$;

-- Execute the function to assign super admin role
SELECT public.assign_super_admin_role();

-- Create trigger to assign default 'user' role for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- Assign default 'user' role to new users
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RETURN NEW;
END;
$$;

-- Create trigger on profiles table (since it's created after user signup)
CREATE TRIGGER on_profile_created_assign_role
    AFTER INSERT ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user_role();

-- Create admin audit log table
CREATE TABLE public.admin_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID NOT NULL,
    action TEXT NOT NULL,
    target_table TEXT,
    target_id TEXT,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS policy for audit log (only super admins can view)
CREATE POLICY "Super admins can view audit log"
ON public.admin_audit_log
FOR SELECT
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can insert audit log"
ON public.admin_audit_log
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));