-- Melhorar a função de cron job para suporte individual por usuário
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
    request_body := 'SELECT net.http_post(url:=''https://zzijiecsvyzaqedatuip.supabase.co/functions/v1/update-tracked-prices'', headers:=''{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6aWppZWNzdnl6YXFlZGF0dWlwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjM1Njk4NiwiZXhwIjoyMDY3OTMyOTg2fQ.ZBOBx8pF1TqXd9_UOjOZ-KjBQTfJ2WofLgpP7cGhyMM"}''::jsonb, body:=''{"scheduled": true, "user_id": "' || p_user_id || '"}''::jsonb) as request_id;';
    
    PERFORM cron.schedule(job_name, cron_schedule, request_body);
  END IF;

  RETURN TRUE;
END;
$function$;

-- Função para listar jobs de usuários específicos
CREATE OR REPLACE FUNCTION public.get_user_cron_jobs(p_user_id uuid DEFAULT NULL)
 RETURNS TABLE(jobname text, schedule text, active boolean, last_run timestamp with time zone, user_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  IF p_user_id IS NULL THEN
    -- Retornar todos os jobs de usuários
    RETURN QUERY 
    SELECT 
      j.jobname, 
      j.schedule, 
      j.active,
      COALESCE(j.last_run_started_at, NULL)::timestamp with time zone as last_run,
      (regexp_match(j.jobname, 'update-prices-user-(.{8}-.{4}-.{4}-.{4}-.{12})'))[1]::uuid as user_id
    FROM cron.job j 
    WHERE j.jobname LIKE 'update-prices-user-%';
  ELSE
    -- Retornar job específico do usuário
    RETURN QUERY 
    SELECT 
      j.jobname, 
      j.schedule, 
      j.active,
      COALESCE(j.last_run_started_at, NULL)::timestamp with time zone as last_run,
      p_user_id as user_id
    FROM cron.job j 
    WHERE j.jobname = 'update-prices-user-' || p_user_id;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- Fallback se last_run_started_at não existe
    IF p_user_id IS NULL THEN
      RETURN QUERY 
      SELECT 
        j.jobname, 
        j.schedule, 
        j.active,
        NULL::timestamp with time zone as last_run,
        (regexp_match(j.jobname, 'update-prices-user-(.{8}-.{4}-.{4}-.{4}-.{12})'))[1]::uuid as user_id
      FROM cron.job j 
      WHERE j.jobname LIKE 'update-prices-user-%';
    ELSE
      RETURN QUERY 
      SELECT 
        j.jobname, 
        j.schedule, 
        j.active,
        NULL::timestamp with time zone as last_run,
        p_user_id as user_id
      FROM cron.job j 
      WHERE j.jobname = 'update-prices-user-' || p_user_id;
    END IF;
END;
$function$;

-- Função para logs de sincronização por usuário
CREATE OR REPLACE FUNCTION public.get_user_sync_logs(p_user_id uuid, limit_count integer DEFAULT 10)
 RETURNS TABLE(id bigint, executed_at timestamp with time zone, execution_type text, status text, duration_ms integer, error_message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY 
  SELECT 
    l.id,
    l.executed_at,
    l.execution_type,
    l.status,
    l.duration_ms,
    l.error_message
  FROM sync_execution_log l 
  WHERE l.response_body LIKE '%' || p_user_id || '%' 
     OR l.error_message LIKE '%' || p_user_id || '%'
  ORDER BY l.executed_at DESC 
  LIMIT limit_count;
END;
$function$;

-- Função para executar sincronização específica de usuário
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
    SELECT * FROM net.http_post(
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