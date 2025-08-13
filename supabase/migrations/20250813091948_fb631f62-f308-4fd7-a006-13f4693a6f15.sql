-- Função melhorada para buscar usuários por email
CREATE OR REPLACE FUNCTION public.search_users_by_email(search_email text)
RETURNS TABLE(id uuid, email text, full_name text, current_balance integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
    -- Verificar se o usuário atual é admin
    IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
        RAISE EXCEPTION 'Access denied. Admin privileges required.';
    END IF;

    -- Log da busca
    RAISE LOG 'Admin % searching for email: %', auth.uid(), search_email;

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
END;
$$;