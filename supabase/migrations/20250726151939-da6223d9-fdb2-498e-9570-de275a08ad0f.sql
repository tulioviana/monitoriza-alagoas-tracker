-- FASE 1: CORREÇÃO CRÍTICA DA FUNÇÃO execute_sync_with_logging
-- Corrigir função que está causando todos os erros no cron

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
    SELECT * FROM net.http_post(
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

-- Corrigir função check_cron_jobs para usar campos corretos
CREATE OR REPLACE FUNCTION public.check_cron_jobs()
 RETURNS TABLE(jobname text, schedule text, active boolean, last_run timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY 
  SELECT 
    j.jobname, 
    j.schedule, 
    j.active,
    j.last_run_started_at as last_run
  FROM cron.job j 
  WHERE j.jobname LIKE '%update-tracked-prices%';
EXCEPTION
  WHEN OTHERS THEN
    -- Se last_run_started_at não existe, usar campos alternativos
    RETURN QUERY 
    SELECT 
      j.jobname, 
      j.schedule, 
      j.active,
      NULL::timestamp with time zone as last_run
    FROM cron.job j 
    WHERE j.jobname LIKE '%update-tracked-prices%';
END;
$function$;