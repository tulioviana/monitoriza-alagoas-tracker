-- CORREÇÃO CRÍTICA: Funções SQL para sincronização automática
-- Problema: Estrutura incorreta do pg_net._http_response causando falhas nos cron jobs

-- 1. Corrigir execute_sync_with_logging
CREATE OR REPLACE FUNCTION public.execute_sync_with_logging()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  request_id bigint;
  response_record RECORD;
  start_time TIMESTAMP;
  end_time TIMESTAMP;
  duration_ms INTEGER;
  result_status TEXT;
  result_message TEXT;
  max_wait_time INTEGER := 120; -- 2 minutes timeout
  wait_time INTEGER := 0;
  check_interval INTEGER := 3; -- Check every 3 seconds
BEGIN
  start_time := NOW();
  
  BEGIN
    -- Make async HTTP request to update-tracked-prices function
    SELECT net.http_post(
      url := 'https://zzijiecsvyzaqedatuip.supabase.co/functions/v1/update-tracked-prices',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6aWppZWNzdnl6YXFlZGF0dWlwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjM1Njk4NiwiZXhwIjoyMDY3OTMyOTg2fQ.ZBOBx8pF1TqXd9_UOjOZ-KjBQTfJ2WofLgpP7cGhyMM"}'::jsonb,
      body := '{"scheduled": true, "source": "cron"}'::jsonb
    ) INTO request_id;
    
    -- Poll for response with proper structure
    WHILE wait_time < max_wait_time LOOP
      SELECT 
        id,
        status_code,
        content,
        error_msg,
        created
      FROM net._http_response 
      WHERE id = request_id 
      INTO response_record;
      
      -- If response found, break the loop
      IF FOUND THEN
        EXIT;
      END IF;
      
      -- Wait before next check
      PERFORM pg_sleep(check_interval);
      wait_time := wait_time + check_interval;
    END LOOP;
    
    end_time := NOW();
    duration_ms := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
    
    -- Determine status based on response
    IF response_record.id IS NULL THEN
      result_status := 'TIMEOUT';
      result_message := 'Request timed out after ' || max_wait_time || ' seconds';
    ELSIF response_record.status_code BETWEEN 200 AND 299 THEN
      result_status := 'SUCCESS';
      result_message := 'Global sync completed successfully';
    ELSE
      result_status := 'ERROR';
      result_message := 'HTTP ' || response_record.status_code || ': ' || COALESCE(response_record.error_msg, 'Unknown error');
    END IF;
    
    -- Log the result
    INSERT INTO sync_execution_log (
      executed_at, 
      execution_type, 
      status, 
      duration_ms,
      response_body,
      error_message
    ) VALUES (
      start_time, 
      'cron', 
      result_status, 
      duration_ms,
      COALESCE(response_record.content::text, ''),
      CASE WHEN result_status != 'SUCCESS' THEN result_message ELSE NULL END
    );
    
    RETURN result_status || ': ' || result_message || ' (Duration: ' || duration_ms || 'ms, Request ID: ' || request_id || ')';
    
  EXCEPTION
    WHEN OTHERS THEN
      end_time := NOW();
      duration_ms := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
      
      -- Log execution error
      INSERT INTO sync_execution_log (
        executed_at, 
        execution_type, 
        status, 
        duration_ms,
        error_message
      ) VALUES (
        start_time, 
        'cron', 
        'EXECUTION_ERROR', 
        duration_ms,
        'Function execution error: ' || SQLERRM
      );
      
      RETURN 'EXECUTION_ERROR: ' || SQLERRM;
  END;
END;
$function$;

-- 2. Corrigir execute_user_sync
CREATE OR REPLACE FUNCTION public.execute_user_sync(p_user_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  request_id bigint;
  response_record RECORD;
  start_time TIMESTAMP;
  end_time TIMESTAMP;
  duration_ms INTEGER;
  result_status TEXT;
  result_message TEXT;
  max_wait_time INTEGER := 180; -- 3 minutes timeout for user-specific sync
  wait_time INTEGER := 0;
  check_interval INTEGER := 3; -- Check every 3 seconds
BEGIN
  start_time := NOW();
  
  BEGIN
    -- Make async HTTP request for specific user
    SELECT net.http_post(
      url := 'https://zzijiecsvyzaqedatuip.supabase.co/functions/v1/update-tracked-prices',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6aWppZWNzdnl6YXFlZGF0dWlwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjM1Njk4NiwiZXhwIjoyMDY3OTMyOTg2fQ.ZBOBx8pF1TqXd9_UOjOZ-KjBQTfJ2WofLgpP7cGhyMM"}'::jsonb,
      body := ('{"scheduled": false, "user_id": "' || p_user_id || '", "source": "user_cron"}')::jsonb
    ) INTO request_id;
    
    -- Poll for response with proper structure
    WHILE wait_time < max_wait_time LOOP
      SELECT 
        id,
        status_code,
        content,
        error_msg,
        created
      FROM net._http_response 
      WHERE id = request_id 
      INTO response_record;
      
      -- If response found, break the loop
      IF FOUND THEN
        EXIT;
      END IF;
      
      -- Wait before next check
      PERFORM pg_sleep(check_interval);
      wait_time := wait_time + check_interval;
    END LOOP;
    
    end_time := NOW();
    duration_ms := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
    
    -- Determine status based on response
    IF response_record.id IS NULL THEN
      result_status := 'TIMEOUT';
      result_message := 'User sync timed out after ' || max_wait_time || ' seconds for user: ' || p_user_id;
    ELSIF response_record.status_code BETWEEN 200 AND 299 THEN
      result_status := 'SUCCESS';
      result_message := 'User sync completed successfully for user: ' || p_user_id;
    ELSE
      result_status := 'ERROR';
      result_message := 'HTTP ' || response_record.status_code || ': ' || COALESCE(response_record.error_msg, 'Unknown error') || ' for user: ' || p_user_id;
    END IF;
    
    -- Log the result with user identification
    INSERT INTO sync_execution_log (
      executed_at, 
      execution_type, 
      status, 
      duration_ms,
      response_body,
      error_message
    ) VALUES (
      start_time, 
      'user_cron', 
      result_status, 
      duration_ms,
      COALESCE(response_record.content::text, '') || ' - User: ' || p_user_id,
      CASE WHEN result_status != 'SUCCESS' THEN result_message ELSE NULL END
    );
    
    RETURN result_status || ': ' || result_message || ' (Duration: ' || duration_ms || 'ms, Request ID: ' || request_id || ')';
    
  EXCEPTION
    WHEN OTHERS THEN
      end_time := NOW();
      duration_ms := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
      
      -- Log execution error
      INSERT INTO sync_execution_log (
        executed_at, 
        execution_type, 
        status, 
        duration_ms,
        error_message
      ) VALUES (
        start_time, 
        'user_cron', 
        'EXECUTION_ERROR', 
        duration_ms,
        'User sync error for ' || p_user_id || ': ' || SQLERRM
      );
      
      RETURN 'EXECUTION_ERROR for user ' || p_user_id || ': ' || SQLERRM;
  END;
END;
$function$;

-- 3. Função para reparar todos os cron jobs de usuários
CREATE OR REPLACE FUNCTION public.repair_all_user_cron_jobs()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  user_settings RECORD;
  total_repaired INTEGER := 0;
  repair_results TEXT := '';
BEGIN
  -- Buscar todos os usuários com configurações
  FOR user_settings IN 
    SELECT user_id, auto_update_enabled, update_frequency 
    FROM system_settings 
    WHERE auto_update_enabled = true
  LOOP
    -- Reparar job de cada usuário
    PERFORM public.update_monitoring_cron_job(
      user_settings.user_id, 
      user_settings.auto_update_enabled, 
      user_settings.update_frequency
    );
    
    total_repaired := total_repaired + 1;
    repair_results := repair_results || 'User: ' || user_settings.user_id || ' (' || user_settings.update_frequency || '), ';
  END LOOP;
  
  RETURN 'Repaired ' || total_repaired || ' user cron jobs: ' || repair_results;
END;
$function$;

-- 4. Função para limpeza de jobs órfãos
CREATE OR REPLACE FUNCTION public.cleanup_orphaned_cron_jobs()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  job_record RECORD;
  cleaned_count INTEGER := 0;
  cleanup_results TEXT := '';
  user_exists BOOLEAN;
BEGIN
  -- Buscar todos os jobs de update-prices-user
  FOR job_record IN 
    SELECT jobname 
    FROM cron.job 
    WHERE jobname LIKE 'update-prices-user-%'
  LOOP
    -- Extrair user_id do nome do job
    DECLARE
      extracted_user_id TEXT;
    BEGIN
      extracted_user_id := (regexp_match(job_record.jobname, 'update-prices-user-(.{8}-.{4}-.{4}-.{4}-.{12})'))[1];
      
      -- Verificar se o usuário ainda tem configurações ativas
      SELECT EXISTS(
        SELECT 1 FROM system_settings 
        WHERE user_id = extracted_user_id::uuid 
        AND auto_update_enabled = true
      ) INTO user_exists;
      
      -- Se usuário não existe ou não tem auto-update ativo, remover job
      IF NOT user_exists THEN
        PERFORM cron.unschedule(job_record.jobname);
        cleaned_count := cleaned_count + 1;
        cleanup_results := cleanup_results || job_record.jobname || ', ';
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        -- Se erro ao extrair UUID, remover job órfão
        PERFORM cron.unschedule(job_record.jobname);
        cleaned_count := cleaned_count + 1;
        cleanup_results := cleanup_results || job_record.jobname || ' (invalid), ';
    END;
  END LOOP;
  
  RETURN 'Cleaned ' || cleaned_count || ' orphaned cron jobs: ' || cleanup_results;
END;
$function$;

-- 5. Executar limpeza e reparo imediato
SELECT public.cleanup_orphaned_cron_jobs();
SELECT public.repair_all_user_cron_jobs();