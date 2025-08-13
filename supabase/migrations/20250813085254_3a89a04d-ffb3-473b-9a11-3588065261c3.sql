-- Criar função para buscar usuário por UUID
CREATE OR REPLACE FUNCTION public.search_user_by_id(user_uuid uuid)
RETURNS TABLE(id uuid, email text, full_name text, current_balance integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
    -- Only allow admins to search by ID
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
    WHERE au.id = user_uuid
    LIMIT 1;
END;
$function$