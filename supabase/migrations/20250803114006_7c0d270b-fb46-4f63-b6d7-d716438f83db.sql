-- Correção crítica das funções SQL para sincronização

-- 1. Corrigir função execute_sync_with_logging para pg_net assíncrono
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
BEGIN
  start_time := NOW();
  
  BEGIN
    -- Make async HTTP request to update-tracked-prices function
    SELECT net.http_post(
      url := 'https://zzijiecsvyzaqedatuip.supabase.co/functions/v1/update-tracked-prices',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6aWppZWNzdnl6YXFlZGF0dWlwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjM1Njk4NiwiZXhwIjoyMDY3OTMyOTg2fQ.ZBOBx8pF1TqXd9_UOjOZ-KjBQTfJ2WofLgpP7cGhyMM"}'::jsonb,
      body := '{"scheduled": true, "source": "cron"}'::jsonb
    ) INTO request_id;
    
    -- Poll for response with timeout
    WHILE wait_time < max_wait_time LOOP
      SELECT * FROM net._http_response 
      WHERE id = request_id 
      INTO response_record;
      
      -- If response found, break the loop
      IF FOUND THEN
        EXIT;
      END IF;
      
      -- Wait 2 seconds before next check (reduce polling frequency)
      PERFORM pg_sleep(2);
      wait_time := wait_time + 2;
    END LOOP;
    
    end_time := NOW();
    duration_ms := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
    
    -- Determine status based on response
    IF response_record.id IS NULL THEN
      result_status := 'TIMEOUT';
      result_message := 'Request timed out after ' || max_wait_time || ' seconds';
    ELSIF response_record.status_code BETWEEN 200 AND 299 THEN
      result_status := 'SUCCESS';
      result_message := 'Sync completed successfully';
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

-- 2. Corrigir função execute_user_sync para pg_net assíncrono
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
BEGIN
  start_time := NOW();
  
  BEGIN
    -- Make async HTTP request for specific user
    SELECT net.http_post(
      url := 'https://zzijiecsvyzaqedatuip.supabase.co/functions/v1/update-tracked-prices',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6aWppZWNzdnl6YXFlZGF0dWlwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjM1Njk4NiwiZXhwIjoyMDY3OTMyOTg2fQ.ZBOBx8pF1TqXd9_UOjOZ-KjBQTfJ2WofLgpP7cGhyMM"}'::jsonb,
      body := ('{"scheduled": false, "user_id": "' || p_user_id || '", "source": "user_cron"}')::jsonb
    ) INTO request_id;
    
    -- Poll for response with timeout
    WHILE wait_time < max_wait_time LOOP
      SELECT * FROM net._http_response 
      WHERE id = request_id 
      INTO response_record;
      
      -- If response found, break the loop
      IF FOUND THEN
        EXIT;
      END IF;
      
      -- Wait 3 seconds before next check
      PERFORM pg_sleep(3);
      wait_time := wait_time + 3;
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

-- 3. Corrigir função update_monitoring_cron_job para criar jobs por usuário
CREATE OR REPLACE FUNCTION public.update_monitoring_cron_job(p_user_id uuid, p_enabled boolean, p_frequency text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  job_name TEXT := 'update-prices-user-' || p_user_id;
  cron_schedule TEXT;
  request_body TEXT;
  job_exists BOOLEAN;
BEGIN
  -- Convert frequency to cron schedule
  CASE p_frequency
    WHEN '5m' THEN cron_schedule := '*/5 * * * *';
    WHEN '30m' THEN cron_schedule := '*/30 * * * *';
    WHEN '1h' THEN cron_schedule := '0 * * * *';
    WHEN '6h' THEN cron_schedule := '0 */6 * * *';
    WHEN '12h' THEN cron_schedule := '0 */12 * * *';
    WHEN '24h' THEN cron_schedule := '0 0 * * *';
    ELSE cron_schedule := '*/30 * * * *';
  END CASE;

  -- Check if job exists before trying to unschedule
  SELECT EXISTS(
    SELECT 1 FROM cron.job WHERE jobname = job_name
  ) INTO job_exists;

  -- Remove existing job only if it exists
  IF job_exists THEN
    PERFORM cron.unschedule(job_name);
  END IF;

  -- Create new job if enabled
  IF p_enabled THEN
    request_body := 'SELECT public.execute_user_sync(''' || p_user_id || '''::uuid);';
    
    PERFORM cron.schedule(job_name, cron_schedule, request_body);
    
    -- Log job creation
    INSERT INTO sync_execution_log (
      executed_at, 
      execution_type, 
      status, 
      duration_ms,
      response_body,
      error_message
    ) VALUES (
      NOW(), 
      'cron_setup', 
      'SUCCESS', 
      0,
      'User cron job created: ' || job_name || ' with schedule: ' || cron_schedule,
      NULL
    );
  ELSE
    -- Log job removal
    INSERT INTO sync_execution_log (
      executed_at, 
      execution_type, 
      status, 
      duration_ms,
      response_body,
      error_message
    ) VALUES (
      NOW(), 
      'cron_setup', 
      'SUCCESS', 
      0,
      'User cron job disabled: ' || job_name,
      NULL
    );
  END IF;

  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    -- Log setup error
    INSERT INTO sync_execution_log (
      executed_at, 
      execution_type, 
      status, 
      duration_ms,
      error_message
    ) VALUES (
      NOW(), 
      'cron_setup', 
      'EXECUTION_ERROR', 
      0,
      'Failed to setup cron job for user ' || p_user_id || ': ' || SQLERRM
    );
    RETURN FALSE;
END;
$function$;

-- 4. Função para forçar sincronização manual de um usuário
CREATE OR REPLACE FUNCTION public.force_user_sync(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Simply call the existing user sync function
  RETURN public.execute_user_sync(p_user_id);
END;
$function$;

-- 5. Função para reparar automaticamente todos os cron jobs dos usuários
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

-- 6. Limpar jobs órfãos e duplicados
SELECT cron.unschedule(jobname) 
FROM cron.job 
WHERE jobname LIKE 'update-prices-user-%' 
  AND jobname NOT IN (
    SELECT 'update-prices-user-' || user_id 
    FROM system_settings 
    WHERE auto_update_enabled = true
  );

-- 7. Reparar automaticamente todos os cron jobs dos usuários
SELECT public.repair_all_user_cron_jobs();