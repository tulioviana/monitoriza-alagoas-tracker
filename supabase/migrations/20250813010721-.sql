-- Create a function to search users by email for admins
CREATE OR REPLACE FUNCTION public.search_users_by_email(search_email text)
RETURNS TABLE(
    id uuid,
    email text,
    full_name text,
    current_balance integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- Only allow admins to search by email
    IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
        RAISE EXCEPTION 'Access denied. Admin privileges required.';
    END IF;

    RETURN QUERY
    SELECT 
        au.id,
        au.email::text,
        COALESCE(p.full_name, au.email::text) as full_name,
        COALESCE(uc.current_balance, 0) as current_balance
    FROM auth.users au
    LEFT JOIN public.profiles p ON au.id = p.id
    LEFT JOIN public.user_credits uc ON au.id = uc.user_id
    WHERE au.email ILIKE '%' || search_email || '%'
    ORDER BY au.email
    LIMIT 10;
END;
$$;