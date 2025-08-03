-- ETAPA 1: Criar função de diagnóstico para identificar problemas
CREATE OR REPLACE FUNCTION public.diagnose_sync_system(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb := '{}';
  edge_function_exists boolean := false;
  request_id bigint;
  user_items_count integer := 0;
  user_settings_exist boolean := false;
BEGIN
  -- Verificar se existem itens ativos para o usuário
  SELECT COUNT(*) INTO user_items_count
  FROM tracked_items 
  WHERE user_id = p_user_id AND is_active = true;
  
  -- Verificar se configurações do usuário existem
  SELECT EXISTS(
    SELECT 1 FROM system_settings WHERE user_id = p_user_id
  ) INTO user_settings_exist;
  
  -- Testar conectividade com Edge Function
  BEGIN
    SELECT net.http_post(
      url := 'https://zzijiecsvyzaqedatuip.supabase.co/functions/v1/update-tracked-prices',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6aWppZWNzdnl6YXFlZGF0dWlwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjM1Njk4NiwiZXhwIjoyMDY3OTMyOTg2fQ.ZBOBx8pF1TqXd9_UOjOZ-KjBQTfJ2WofLgpP7cGhyMM"}'::jsonb,
      body := ('{"test": true, "user_id": "' || p_user_id || '"}')::jsonb
    ) INTO request_id;
    
    edge_function_exists := true;
  EXCEPTION
    WHEN OTHERS THEN
      edge_function_exists := false;
  END;
  
  -- Construir resultado do diagnóstico
  result := jsonb_build_object(
    'user_id', p_user_id,
    'active_items_count', user_items_count,
    'user_settings_exist', user_settings_exist,
    'edge_function_accessible', edge_function_exists,
    'test_request_id', request_id,
    'system_ready', (
      user_items_count > 0 AND 
      user_settings_exist AND 
      edge_function_exists
    ),
    'diagnosed_at', NOW()
  );
  
  RETURN result;
END;
$$;

-- ETAPA 2: Melhorar função de sync com melhor tratamento de erros
CREATE OR REPLACE FUNCTION public.force_user_sync_robust(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  request_id bigint;
  sync_id uuid;
  user_items_count integer := 0;
  diagnosis_result jsonb;
BEGIN
  -- Executar diagnóstico primeiro
  SELECT public.diagnose_sync_system(p_user_id) INTO diagnosis_result;
  
  -- Verificar se sistema está pronto
  IF NOT (diagnosis_result->>'system_ready')::boolean THEN
    RETURN 'SYSTEM_NOT_READY: ' || diagnosis_result::text;
  END IF;
  
  -- Contar itens ativos
  SELECT COUNT(*) INTO user_items_count
  FROM tracked_items 
  WHERE user_id = p_user_id AND is_active = true;
  
  IF user_items_count = 0 THEN
    RETURN 'NO_ITEMS: Nenhum item ativo encontrado para sincronização';
  END IF;
  
  -- Criar ou atualizar status de sync
  INSERT INTO sync_status (user_id, status, started_at, total_items)
  VALUES (p_user_id, 'running', NOW(), user_items_count)
  ON CONFLICT (user_id) DO UPDATE SET
    status = 'running',
    started_at = NOW(),
    progress = 0,
    total_items = user_items_count,
    current_item = NULL,
    completed_at = NULL,
    error_message = NULL,
    updated_at = NOW()
  RETURNING id INTO sync_id;

  -- Fazer chamada HTTP assíncrona com timeout reduzido
  BEGIN
    SELECT net.http_post(
      url := 'https://zzijiecsvyzaqedatuip.supabase.co/functions/v1/update-tracked-prices',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6aWppZWNzdnl6YXFlZGF0dWlwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjM1Njk4NiwiZXhwIjoyMDY3OTMyOTg2fQ.ZBOBx8pF1TqXd9_UOjOZ-KjBQTfJ2WofLgpP7cGhyMM"}'::jsonb,
      body := jsonb_build_object(
        'scheduled', false,
        'user_id', p_user_id,
        'source', 'user_manual_robust',
        'sync_id', sync_id,
        'force_update', true
      )
    ) INTO request_id;

    -- Log do início
    INSERT INTO sync_execution_log (
      executed_at, 
      execution_type, 
      status, 
      duration_ms,
      response_body
    ) VALUES (
      NOW(), 
      'user_manual_robust', 
      'STARTED_ASYNC', 
      0,
      'User: ' || p_user_id || ' - Robust async sync started - Request ID: ' || request_id || ' - Sync ID: ' || sync_id || ' - Items: ' || user_items_count
    );

    RETURN 'ASYNC_STARTED: Sincronização robusta iniciada. ID: ' || sync_id || ', Request: ' || request_id || ', Items: ' || user_items_count;
    
  EXCEPTION
    WHEN OTHERS THEN
      -- Atualizar status com erro
      UPDATE sync_status 
      SET status = 'error', 
          error_message = 'Erro ao chamar Edge Function: ' || SQLERRM,
          completed_at = NOW(),
          updated_at = NOW()
      WHERE user_id = p_user_id;
      
      -- Log do erro
      INSERT INTO sync_execution_log (
        executed_at, 
        execution_type, 
        status, 
        duration_ms,
        error_message
      ) VALUES (
        NOW(), 
        'user_manual_robust', 
        'EDGE_FUNCTION_ERROR', 
        0,
        'User: ' || p_user_id || ' - Edge Function call failed: ' || SQLERRM
      );
      
      RETURN 'EDGE_FUNCTION_ERROR: ' || SQLERRM;
  END;
END;
$$;

-- ETAPA 3: Atualizar função principal para usar a versão robusta
CREATE OR REPLACE FUNCTION public.force_user_sync_async(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Usar a nova implementação robusta
  RETURN public.force_user_sync_robust(p_user_id);
END;
$$;