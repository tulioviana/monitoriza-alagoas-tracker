-- Clean up and standardize RPC functions for user search
-- Drop any existing versions to ensure clean state
DROP FUNCTION IF EXISTS public.search_user_by_id(uuid);
DROP FUNCTION IF EXISTS public.search_users_by_email(text);
DROP FUNCTION IF EXISTS public.search_users_by_name(text);

-- Recreate the correct versions with admin_user_id parameter and improved logging
CREATE OR REPLACE FUNCTION public.search_user_by_id(user_uuid uuid, admin_user_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id uuid, email text, full_name text, current_balance integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
    checking_user_id uuid;
BEGIN
    -- Use admin_user_id parameter if provided, otherwise auth.uid()
    checking_user_id := COALESCE(admin_user_id, auth.uid());
    
    -- Detailed logging for debugging
    RAISE LOG 'search_user_by_id: Starting search for UUID: % by admin: %', user_uuid, checking_user_id;
    
    -- Verify admin privileges
    IF NOT is_user_admin(checking_user_id) THEN
        RAISE LOG 'search_user_by_id: Access denied for user: % (not admin)', checking_user_id;
        RAISE EXCEPTION 'Access denied. Admin privileges required.';
    END IF;

    RAISE LOG 'search_user_by_id: Admin verified, proceeding with search';

    RETURN QUERY
    SELECT 
        p.id,
        COALESCE(au.email::text, 'N/A') as email,
        COALESCE(p.full_name, au.email::text, 'Usuário sem nome') as full_name,
        COALESCE(uc.current_balance, 0) as current_balance
    FROM public.profiles p
    LEFT JOIN auth.users au ON p.id = au.id
    LEFT JOIN public.user_credits uc ON p.id = uc.user_id
    WHERE p.id = user_uuid
    
    UNION ALL
    
    SELECT 
        au.id,
        au.email::text,
        COALESCE(au.email::text, 'Usuário') as full_name,
        COALESCE(uc.current_balance, 0) as current_balance
    FROM auth.users au
    LEFT JOIN public.user_credits uc ON au.id = uc.user_id
    WHERE au.id = user_uuid
    AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = user_uuid)
    
    LIMIT 1;
    
    RAISE LOG 'search_user_by_id: Search completed for UUID: %', user_uuid;
END;
$function$;

CREATE OR REPLACE FUNCTION public.search_users_by_email(search_email text, admin_user_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id uuid, email text, full_name text, current_balance integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
    checking_user_id uuid;
BEGIN
    checking_user_id := COALESCE(admin_user_id, auth.uid());
    
    RAISE LOG 'search_users_by_email: Starting search for email: % by admin: %', search_email, checking_user_id;
    
    IF NOT is_user_admin(checking_user_id) THEN
        RAISE LOG 'search_users_by_email: Access denied for user: % (not admin)', checking_user_id;
        RAISE EXCEPTION 'Access denied. Admin privileges required.';
    END IF;

    RAISE LOG 'search_users_by_email: Admin verified, proceeding with search';

    RETURN QUERY
    SELECT 
        p.id,
        COALESCE(au.email::text, 'N/A') as email,
        COALESCE(p.full_name, au.email::text, 'Usuário') as full_name,
        COALESCE(uc.current_balance, 0) as current_balance
    FROM public.profiles p
    LEFT JOIN auth.users au ON p.id = au.id
    LEFT JOIN public.user_credits uc ON p.id = uc.user_id
    WHERE au.email ILIKE '%' || search_email || '%'
    
    UNION
    
    SELECT 
        au.id,
        au.email::text,
        COALESCE(au.email::text, 'Usuário') as full_name,
        COALESCE(uc.current_balance, 0) as current_balance
    FROM auth.users au
    LEFT JOIN public.user_credits uc ON au.id = uc.user_id
    WHERE au.email ILIKE '%' || search_email || '%'
    AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = au.id)
    
    ORDER BY email
    LIMIT 10;
    
    RAISE LOG 'search_users_by_email: Search completed for email: %', search_email;
END;
$function$;

CREATE OR REPLACE FUNCTION public.search_users_by_name(search_name text, admin_user_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id uuid, email text, full_name text, current_balance integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
    checking_user_id uuid;
BEGIN
    checking_user_id := COALESCE(admin_user_id, auth.uid());
    
    RAISE LOG 'search_users_by_name: Starting search for name: % by admin: %', search_name, checking_user_id;
    
    IF NOT is_user_admin(checking_user_id) THEN
        RAISE LOG 'search_users_by_name: Access denied for user: % (not admin)', checking_user_id;
        RAISE EXCEPTION 'Access denied. Admin privileges required.';
    END IF;

    RAISE LOG 'search_users_by_name: Admin verified, proceeding with search';

    RETURN QUERY
    SELECT 
        p.id,
        COALESCE(au.email::text, 'N/A') as email,
        COALESCE(p.full_name, au.email::text, 'Usuário') as full_name,
        COALESCE(uc.current_balance, 0) as current_balance
    FROM public.profiles p
    LEFT JOIN auth.users au ON p.id = au.id
    LEFT JOIN public.user_credits uc ON p.id = uc.user_id
    WHERE p.full_name ILIKE '%' || search_name || '%'
    ORDER BY p.full_name
    LIMIT 10;
    
    RAISE LOG 'search_users_by_name: Search completed for name: %', search_name;
END;
$function$;