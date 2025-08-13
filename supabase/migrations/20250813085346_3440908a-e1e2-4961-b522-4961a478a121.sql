-- Criar função para buscar usuários por nome no profiles
CREATE OR REPLACE FUNCTION public.search_users_by_name(search_name text)
RETURNS TABLE(id uuid, email text, full_name text, current_balance integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
    -- Only allow admins to search by name
    IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
        RAISE EXCEPTION 'Access denied. Admin privileges required.';
    END IF;

    RETURN QUERY
    SELECT 
        au.id,
        COALESCE(au.email::text, '') as email,
        COALESCE(p.full_name, au.email::text, 'Usuário') as full_name,
        COALESCE(uc.current_balance, 0) as current_balance
    FROM public.profiles p
    LEFT JOIN auth.users au ON p.id = au.id
    LEFT JOIN public.user_credits uc ON p.id = uc.user_id
    WHERE p.full_name ILIKE '%' || search_name || '%'
    ORDER BY p.full_name
    LIMIT 10;
END;
$function$