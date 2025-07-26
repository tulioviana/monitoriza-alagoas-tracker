-- FASE 1: Correção crítica da função execute_sync_with_logging()
-- Esta função agora implementa polling assíncrono para aguardar respostas HTTP

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
  check_interval INTERVAL := INTERVAL '5 seconds';
  wait_count INTEGER := 0;
  max_checks INTEGER := 36; -- 3 minutos / 5 segundos
BEGIN
  start_time := NOW();
  
  BEGIN
    -- Executar a requisição HTTP e obter o ID
    SELECT net.http_post(
      url := 'https://zzijiecsvyzaqedatuip.supabase.co/functions/v1/update-tracked-prices',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6aWppZWNzdnl6YXFlZGF0dWlwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjM1Njk4NiwiZXhwIjoyMDY3OTMyOTg2fQ.ZBOBx8pF1TqXd9_UOjOZ-KjBQTfJ2WofLgpP7cGhyMM"}'::jsonb,
      body := '{"scheduled": true, "source": "cron_v2"}'::jsonb,
      timeout_milliseconds := 180000 -- 3 minutos de timeout
    ) INTO request_id;
    
    -- Aguardar resposta assíncrona com polling
    WHILE wait_count < max_checks LOOP
      -- Verificar se a resposta está disponível
      SELECT * FROM net._http_response 
      WHERE id = request_id 
      INTO response_record;
      
      IF FOUND THEN
        end_time := NOW();
        duration_ms := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
        
        -- Log de sucesso com dados da resposta
        INSERT INTO sync_execution_log (
          executed_at, 
          execution_type, 
          status, 
          request_id, 
          response_body,
          duration_ms,
          error_message
        ) VALUES (
          start_time, 
          'cron_v2', 
          CASE 
            WHEN response_record.status_code BETWEEN 200 AND 299 THEN 'SUCCESS'
            ELSE 'ERROR'
          END,
          request_id,
          COALESCE(response_record.content, ''),
          duration_ms,
          CASE 
            WHEN response_record.status_code NOT BETWEEN 200 AND 299 
            THEN 'HTTP ' || response_record.status_code || ': ' || COALESCE(response_record.error_msg, 'Unknown error')
            ELSE NULL
          END
        );
        
        RETURN CASE 
          WHEN response_record.status_code BETWEEN 200 AND 299 
          THEN 'SUCCESS: Request completed with status ' || response_record.status_code || ' in ' || duration_ms || 'ms'
          ELSE 'ERROR: HTTP ' || response_record.status_code || ' - ' || COALESCE(response_record.error_msg, 'Unknown error')
        END;
      END IF;
      
      -- Aguardar antes da próxima verificação
      PERFORM pg_sleep(5);
      wait_count := wait_count + 1;
    END LOOP;
    
    -- Timeout - nenhuma resposta recebida
    end_time := NOW();
    duration_ms := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
    
    INSERT INTO sync_execution_log (
      executed_at, 
      execution_type, 
      status, 
      request_id,
      duration_ms,
      error_message
    ) VALUES (
      start_time, 
      'cron_v2', 
      'TIMEOUT', 
      request_id,
      duration_ms,
      'Request timeout after ' || max_wait_time || ' - no response received'
    );
    
    RETURN 'TIMEOUT: No response received after ' || max_wait_time;
    
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
        'cron_v2', 
        'EXECUTION_ERROR', 
        duration_ms,
        'Function execution error: ' || SQLERRM
      );
      
      RETURN 'EXECUTION_ERROR: ' || SQLERRM;
  END;
END;
$function$