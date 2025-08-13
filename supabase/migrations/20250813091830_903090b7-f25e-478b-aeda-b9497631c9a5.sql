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
AS $function$
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
    
    -- Fallback: buscar diretamente em auth.users se não encontrou em profiles
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
$function$

-- Função melhorada para buscar usuários por email
CREATE OR REPLACE FUNCTION public.search_users_by_email(search_email text)
RETURNS TABLE(id uuid, email text, full_name text, current_balance integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
    -- Verificar se o usuário atual é admin
    IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
        RAISE EXCEPTION 'Access denied. Admin privileges required.';
    END IF;

    -- Log da busca
    RAISE LOG 'Admin % searching for email: %', auth.uid(), search_email;

    RETURN QUERY
    -- Buscar em profiles primeiro
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
    
    -- Fallback: buscar em auth.users para usuários sem perfil
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
$function$

-- Função melhorada para buscar usuários por nome
CREATE OR REPLACE FUNCTION public.search_users_by_name(search_name text)
RETURNS TABLE(id uuid, email text, full_name text, current_balance integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
    -- Verificar se o usuário atual é admin
    IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
        RAISE EXCEPTION 'Access denied. Admin privileges required.';
    END IF;

    -- Log da busca
    RAISE LOG 'Admin % searching for name: %', auth.uid(), search_name;

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
$function$

-- Função para verificar e criar role de admin para o usuário específico
CREATE OR REPLACE FUNCTION public.ensure_admin_role()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
    admin_email text := 'tuliovianaoficial@gmail.com';
    target_user_id uuid;
BEGIN
    -- Buscar o ID do usuário pelo email
    SELECT id INTO target_user_id
    FROM auth.users
    WHERE email = admin_email;
    
    IF target_user_id IS NOT NULL THEN
        -- Inserir role de admin se não existir
        INSERT INTO public.user_roles (user_id, role)
        VALUES (target_user_id, 'admin'::app_role)
        ON CONFLICT (user_id, role) DO NOTHING;
        
        RAISE LOG 'Admin role ensured for user: % with email: %', target_user_id, admin_email;
    ELSE
        RAISE LOG 'User with email % not found', admin_email;
    END IF;
END;
$function$

-- Executar a função para garantir que o usuário tenha role de admin
SELECT public.ensure_admin_role();