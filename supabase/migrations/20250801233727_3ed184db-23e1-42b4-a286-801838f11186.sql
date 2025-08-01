-- Limpar job cron global antigo que está causando problemas
SELECT cron.unschedule('update-prices-global') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'update-prices-global'
);

-- Corrigir função execute_sync_with_logging
CREATE OR REPLACE FUNCTION public.execute_sync_with_logging()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  response_result RECORD;
  start_time TIMESTAMP;
  end_time TIMESTAMP;
  duration_ms INTEGER;
  result_status TEXT;
  result_message TEXT;
BEGIN
  start_time := NOW();
  
  BEGIN
    -- Executar a requisição HTTP
    SELECT status_code, content, error_msg FROM net.http_post(
      url := 'https://zzijiecsvyzaqedatuip.supabase.co/functions/v1/update-tracked-prices',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6aWppZWNzdnl6YXFlZGF0dWlwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjM1Njk4NiwiZXhwIjoyMDY3OTMyOTg2fQ.ZBOBx8pF1TqXd9_UOjOZ-KjBQTfJ2WofLgpP7cGhyMM"}'::jsonb,
      body := '{"scheduled": true, "source": "cron"}'::jsonb,
      timeout_milliseconds := 120000
    ) INTO response_result;
    
    end_time := NOW();
    duration_ms := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
    
    -- Determinar status baseado na resposta
    IF response_result.status_code BETWEEN 200 AND 299 THEN
      result_status := 'SUCCESS';
      result_message := 'Execution completed successfully';
    ELSE
      result_status := 'ERROR';
      result_message := 'HTTP ' || response_result.status_code || ': ' || COALESCE(response_result.error_msg, 'Unknown error');
    END IF;
    
    -- Log do resultado
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
      COALESCE(response_result.content, ''),
      CASE WHEN result_status = 'ERROR' THEN result_message ELSE NULL END
    );
    
    RETURN result_status || ': ' || result_message || ' (Duration: ' || duration_ms || 'ms)';
    
  EXCEPTION
    WHEN OTHERS THEN
      end_time := NOW();
      duration_ms := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
      
      -- Log do erro de execução
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

-- Corrigir função execute_user_sync
CREATE OR REPLACE FUNCTION public.execute_user_sync(p_user_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  response_result RECORD;
  start_time TIMESTAMP;
  end_time TIMESTAMP;
  duration_ms INTEGER;
  result_status TEXT;
  result_message TEXT;
BEGIN
  start_time := NOW();
  
  BEGIN
    -- Executar a requisição HTTP para o usuário específico
    SELECT status_code, content, error_msg FROM net.http_post(
      url := 'https://zzijiecsvyzaqedatuip.supabase.co/functions/v1/update-tracked-prices',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6aWppZWNzdnl6YXFlZGF0dWlwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjM1Njk4NiwiZXhwIjoyMDY3OTMyOTg2fQ.ZBOBx8pF1TqXd9_UOjOZ-KjBQTfJ2WofLgpP7cGhyMM"}'::jsonb,
      body := ('{"scheduled": false, "user_id": "' || p_user_id || '", "source": "manual"}')::jsonb,
      timeout_milliseconds := 120000
    ) INTO response_result;
    
    end_time := NOW();
    duration_ms := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
    
    -- Determinar status baseado na resposta
    IF response_result.status_code BETWEEN 200 AND 299 THEN
      result_status := 'SUCCESS';
      result_message := 'User sync completed successfully';
    ELSE
      result_status := 'ERROR';
      result_message := 'HTTP ' || response_result.status_code || ': ' || COALESCE(response_result.error_msg, 'Unknown error');
    END IF;
    
    -- Log do resultado
    INSERT INTO sync_execution_log (
      executed_at, 
      execution_type, 
      status, 
      duration_ms,
      response_body,
      error_message
    ) VALUES (
      start_time, 
      'manual', 
      result_status, 
      duration_ms,
      COALESCE(response_result.content, '') || ' - User: ' || p_user_id,
      CASE WHEN result_status = 'ERROR' THEN result_message ELSE NULL END
    );
    
    RETURN result_status || ': ' || result_message || ' (Duration: ' || duration_ms || 'ms)';
    
  EXCEPTION
    WHEN OTHERS THEN
      end_time := NOW();
      duration_ms := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
      
      -- Log do erro de execução
      INSERT INTO sync_execution_log (
        executed_at, 
        execution_type, 
        status, 
        duration_ms,
        error_message
      ) VALUES (
        start_time, 
        'manual', 
        'EXECUTION_ERROR', 
        duration_ms,
        'User sync error for ' || p_user_id || ': ' || SQLERRM
      );
      
      RETURN 'EXECUTION_ERROR: ' || SQLERRM;
  END;
END;
$function$;

-- Melhorar função update_monitoring_cron_job para limpeza automática
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
  END IF;

  RETURN TRUE;
END;
$function$;

-- Função para reparar sincronização de usuário
CREATE OR REPLACE FUNCTION public.repair_user_sync(p_user_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  settings_record RECORD;
  result TEXT;
BEGIN
  -- Buscar configurações do usuário
  SELECT auto_update_enabled, update_frequency 
  INTO settings_record
  FROM system_settings 
  WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    -- Criar configurações padrão se não existir
    INSERT INTO system_settings (user_id, auto_update_enabled, update_frequency)
    VALUES (p_user_id, true, '30m');
    
    settings_record.auto_update_enabled := true;
    settings_record.update_frequency := '30m';
  END IF;
  
  -- Recriar job de sincronização
  SELECT public.update_monitoring_cron_job(
    p_user_id, 
    settings_record.auto_update_enabled, 
    settings_record.update_frequency
  ) INTO result;
  
  RETURN 'Sync repaired for user ' || p_user_id || ' with frequency ' || settings_record.update_frequency;
END;
$function$;