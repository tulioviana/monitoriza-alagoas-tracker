-- Função para garantir que o usuário específico tenha role de admin
CREATE OR REPLACE FUNCTION public.ensure_admin_role()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
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
$$;

-- Executar a função para garantir que o usuário tenha role de admin
SELECT public.ensure_admin_role();