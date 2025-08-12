-- Create user_roles table (skip enum creation since it already exists)
CREATE TABLE IF NOT EXISTS public.user_roles (
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

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins can manage all roles" ON public.user_roles;

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

-- Create function to assign super admin role safely
CREATE OR REPLACE FUNCTION public.assign_super_admin_to_email(target_email TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    target_user_id UUID;
BEGIN
    -- Get user ID from profiles table by checking email
    SELECT p.id INTO target_user_id
    FROM public.profiles p
    WHERE p.id = (
        SELECT au.id 
        FROM auth.users au 
        WHERE au.email = target_email
        LIMIT 1
    );
    
    IF target_user_id IS NOT NULL THEN
        -- Insert super_admin role
        INSERT INTO public.user_roles (user_id, role)
        VALUES (target_user_id, 'super_admin')
        ON CONFLICT (user_id, role) DO NOTHING;
        
        RAISE LOG 'Super admin role assigned to user: % with email: %', target_user_id, target_email;
    ELSE
        -- If not found in profiles, let's try to insert based on auth.users directly
        SELECT au.id INTO target_user_id
        FROM auth.users au
        WHERE au.email = target_email
        LIMIT 1;
        
        IF target_user_id IS NOT NULL THEN
            INSERT INTO public.user_roles (user_id, role)
            VALUES (target_user_id, 'super_admin')
            ON CONFLICT (user_id, role) DO NOTHING;
            
            RAISE LOG 'Super admin role assigned to user: % with email: %', target_user_id, target_email;
        ELSE
            RAISE LOG 'User with email % not found', target_email;
        END IF;
    END IF;
END;
$$;

-- Execute the function to assign super admin role
SELECT public.assign_super_admin_to_email('tuliomv7@gmail.com');

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

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_profile_created_assign_role ON public.profiles;

-- Create trigger on profiles table (since it's created after user signup)
CREATE TRIGGER on_profile_created_assign_role
    AFTER INSERT ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user_role();