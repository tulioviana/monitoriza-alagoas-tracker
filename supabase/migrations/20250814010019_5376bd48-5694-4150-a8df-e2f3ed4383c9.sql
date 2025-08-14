-- Corrigir as funções RPC de busca de usuários para receber o admin_user_id como parâmetro
-- e usar uma verificação de permissão mais robusta

-- Função auxiliar para verificar se um usuário é admin usando parâmetro
CREATE OR REPLACE FUNCTION public.is_user_admin(check_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = check_user_id
        AND role = 'admin'::app_role
    );
END;
$$;

-- Atualizar função search_user_by_id para usar parâmetro admin_user_id
CREATE OR REPLACE FUNCTION public.search_user_by_id(user_uuid uuid, admin_user_id uuid DEFAULT NULL)
RETURNS TABLE(id uuid, email text, full_name text, current_balance integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    checking_user_id uuid;
BEGIN
    -- Usar o parâmetro admin_user_id se fornecido, senão auth.uid()
    checking_user_id := COALESCE(admin_user_id, auth.uid());
    
    -- Log da verificação
    RAISE LOG 'search_user_by_id: Checking admin for user_id: %, auth.uid(): %', checking_user_id, auth.uid();
    
    -- Verificar se o usuário é admin
    IF NOT is_user_admin(checking_user_id) THEN
        RAISE LOG 'search_user_by_id: Access denied for user_id: %', checking_user_id;
        RAISE EXCEPTION 'Access denied. Admin privileges required.';
    END IF;

    -- Log da busca
    RAISE LOG 'search_user_by_id: Admin % searching for user ID: %', checking_user_id, user_uuid;

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

-- Atualizar função search_users_by_email para usar parâmetro admin_user_id
CREATE OR REPLACE FUNCTION public.search_users_by_email(search_email text, admin_user_id uuid DEFAULT NULL)
RETURNS TABLE(id uuid, email text, full_name text, current_balance integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    checking_user_id uuid;
BEGIN
    -- Usar o parâmetro admin_user_id se fornecido, senão auth.uid()
    checking_user_id := COALESCE(admin_user_id, auth.uid());
    
    -- Log da verificação
    RAISE LOG 'search_users_by_email: Checking admin for user_id: %, auth.uid(): %', checking_user_id, auth.uid();
    
    -- Verificar se o usuário é admin
    IF NOT is_user_admin(checking_user_id) THEN
        RAISE LOG 'search_users_by_email: Access denied for user_id: %', checking_user_id;
        RAISE EXCEPTION 'Access denied. Admin privileges required.';
    END IF;

    -- Log da busca
    RAISE LOG 'search_users_by_email: Admin % searching for email: %', checking_user_id, search_email;

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

-- Atualizar função search_users_by_name para usar parâmetro admin_user_id
CREATE OR REPLACE FUNCTION public.search_users_by_name(search_name text, admin_user_id uuid DEFAULT NULL)
RETURNS TABLE(id uuid, email text, full_name text, current_balance integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    checking_user_id uuid;
BEGIN
    -- Usar o parâmetro admin_user_id se fornecido, senão auth.uid()
    checking_user_id := COALESCE(admin_user_id, auth.uid());
    
    -- Log da verificação
    RAISE LOG 'search_users_by_name: Checking admin for user_id: %, auth.uid(): %', checking_user_id, auth.uid();
    
    -- Verificar se o usuário é admin
    IF NOT is_user_admin(checking_user_id) THEN
        RAISE LOG 'search_users_by_name: Access denied for user_id: %', checking_user_id;
        RAISE EXCEPTION 'Access denied. Admin privileges required.';
    END IF;

    -- Log da busca
    RAISE LOG 'search_users_by_name: Admin % searching for name: %', checking_user_id, search_name;

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
END;
$$;