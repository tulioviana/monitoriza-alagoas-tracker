-- FASE 1: CORREÇÃO CRÍTICA DO CRON JOB
-- Corrigir função execute_sync_with_logging com tratamento adequado de respostas assíncronas

CREATE OR REPLACE FUNCTION public.execute_sync_with_logging()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  request_id BIGINT;
  response_record RECORD;
  start_time TIMESTAMP;
  end_time TIMESTAMP;
  duration_ms INTEGER;
  max_wait_time INTERVAL := INTERVAL '3 minutes';
  check_interval INTEGER := 5; -- segundos
  attempts INTEGER := 0;
  max_attempts INTEGER := 36; -- 3 minutos / 5 segundos
BEGIN
  start_time := NOW();
  
  BEGIN
    -- Fazer requisição HTTP assíncrona
    SELECT net.http_post(
      url := 'https://zzijiecsvyzaqedatuip.supabase.co/functions/v1/update-tracked-prices',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6aWppZWNzdnl6YXFlZGF0dWlwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjM1Njk4NiwiZXhwIjoyMDY3OTMyOTg2fQ.ZBOBx8pF1TqXd9_UOjOZ-KjBQTfJ2WofLgpP7cGhyMM"}'::jsonb,
      body := '{"scheduled": true, "source": "cron_v2"}'::jsonb,
      timeout_milliseconds := 180000 -- 3 minutos
    ) INTO request_id;
    
    -- Aguardar resposta assíncrona com polling
    WHILE attempts < max_attempts LOOP
      SELECT * FROM net._http_response WHERE id = request_id INTO response_record;
      
      IF FOUND THEN
        end_time := NOW();
        duration_ms := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
        
        -- Log de sucesso com dados corretos
        INSERT INTO sync_execution_log (
          executed_at, 
          execution_type, 
          status, 
          request_id::uuid, 
          response_body,
          duration_ms
        ) VALUES (
          start_time, 
          'cron_v2', 
          CASE 
            WHEN response_record.status_code BETWEEN 200 AND 299 THEN 'SUCCESS'
            ELSE 'ERROR'
          END,
          request_id::uuid,
          COALESCE(response_record.content, response_record.error_msg),
          duration_ms
        );
        
        RETURN 'SUCCESS: Request completed with status ' || response_record.status_code || ' in ' || duration_ms || 'ms';
      END IF;
      
      -- Aguardar antes da próxima verificação
      PERFORM pg_sleep(check_interval);
      attempts := attempts + 1;
    END LOOP;
    
    -- Timeout - requisição não completou
    end_time := NOW();
    duration_ms := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
    
    INSERT INTO sync_execution_log (
      executed_at, 
      execution_type, 
      status, 
      error_message,
      duration_ms
    ) VALUES (
      start_time, 
      'cron_v2', 
      'TIMEOUT', 
      'Request timed out after ' || max_wait_time,
      duration_ms
    );
    
    RETURN 'TIMEOUT: Request did not complete within ' || max_wait_time;
    
  EXCEPTION
    WHEN OTHERS THEN
      end_time := NOW();
      duration_ms := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
      
      -- Log do erro
      INSERT INTO sync_execution_log (
        executed_at, 
        execution_type, 
        status, 
        error_message,
        duration_ms
      ) VALUES (
        start_time, 
        'cron_v2', 
        'ERROR', 
        SQLERRM,
        duration_ms
      );
      
      RETURN 'ERROR: ' || SQLERRM;
  END;
END;
$function$;

-- Recriar o cron job com a função corrigida
SELECT cron.unschedule('update-tracked-prices-job');

SELECT cron.schedule(
  'update-tracked-prices-job',
  '*/5 * * * *',
  'SELECT public.execute_sync_with_logging();'
);