-- Correção crítica das funções SQL para sincronização
-- Problema identificado: campo "status" não existe, o correto é "status_code"

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
  max_wait_time INTEGER := 180; -- 3 minutos timeout aumentado
  wait_time INTEGER := 0;
  check_interval INTEGER := 5; -- Check a cada 5 segundos
BEGIN
  start_time := NOW();
  
  BEGIN
    -- Make async HTTP request to update-tracked-prices function
    SELECT net.http_post(
      url := 'https://zzijiecsvyzaqedatuip.supabase.co/functions/v1/update-tracked-prices',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6aWppZWNzdnl6YXFlZGF0dWlwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjM1Njk4NiwiZXhwIjoyMDY3OTMyOTg2fQ.ZBOBx8pF1TqXd9_UOjOZ-KjBQTfJ2WofLgpP7cGhyMM"}'::jsonb,
      body := '{"scheduled": true, "source": "cron"}'::jsonb
    ) INTO request_id;
    
    -- Log de início
    INSERT INTO sync_execution_log (
      executed_at, 
      execution_type, 
      status, 
      duration_ms,
      response_body
    ) VALUES (
      start_time, 
      'cron', 
      'STARTED', 
      0,
      'Request ID: ' || request_id || ' - Waiting for response...'
    );
    
    -- Poll for response com estrutura corrigida
    WHILE wait_time < max_wait_time LOOP
      SELECT 
        id,
        status_code, -- CORRIGIDO: usar status_code ao invés de status
        content,
        error_msg,
        created,
        timed_out
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
      result_message := 'Global sync timed out after ' || max_wait_time || ' seconds';
    ELSIF response_record.timed_out = true THEN
      result_status := 'TIMEOUT';
      result_message := 'Edge function timed out';
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
      COALESCE(response_record.content::text, '') || ' - Request ID: ' || request_id,
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
  max_wait_time INTEGER := 240; -- 4 minutos timeout para sync específico de usuário
  wait_time INTEGER := 0;
  check_interval INTEGER := 5; -- Check a cada 5 segundos
BEGIN
  start_time := NOW();
  
  BEGIN
    -- Make async HTTP request for specific user
    SELECT net.http_post(
      url := 'https://zzijiecsvyzaqedatuip.supabase.co/functions/v1/update-tracked-prices',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6aWppZWNzdnl6YXFlZGF0dWlwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjM1Njk4NiwiZXhwIjoyMDY3OTMyOTg2fQ.ZBOBx8pF1TqXd9_UOjOZ-KjBQTfJ2WofLgpP7cGhyMM"}'::jsonb,
      body := ('{"scheduled": false, "user_id": "' || p_user_id || '", "source": "user_cron"}')::jsonb
    ) INTO request_id;
    
    -- Log de início
    INSERT INTO sync_execution_log (
      executed_at, 
      execution_type, 
      status, 
      duration_ms,
      response_body
    ) VALUES (
      start_time, 
      'user_cron', 
      'STARTED', 
      0,
      'User: ' || p_user_id || ' - Request ID: ' || request_id || ' - Waiting for response...'
    );
    
    -- Poll for response com estrutura corrigida
    WHILE wait_time < max_wait_time LOOP
      SELECT 
        id,
        status_code, -- CORRIGIDO: usar status_code ao invés de status
        content,
        error_msg,
        created,
        timed_out
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
    ELSIF response_record.timed_out = true THEN
      result_status := 'TIMEOUT';
      result_message := 'Edge function timed out for user: ' || p_user_id;
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
      COALESCE(response_record.content::text, '') || ' - User: ' || p_user_id || ' - Request ID: ' || request_id,
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