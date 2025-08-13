-- Corrigir e melhorar as funções RPC para busca de usuários
-- Drop das funções existentes que estão com problemas
DROP FUNCTION IF EXISTS public.search_user_by_id(uuid);
DROP FUNCTION IF EXISTS public.search_users_by_email(text);
DROP FUNCTION IF EXISTS public.search_users_by_name(text);

-- Função melhorada para buscar usuário por ID
CREATE OR REPLACE FUNCTION public.search_user_by_id(user_uuid uuid)
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
    RAISE LOG 'Admin % searching for user ID: %', auth.uid(), user_uuid;

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
END;
$$;