-- Corrigir função execute_user_sync que está falhando devido ao erro na estrutura do net.http_post
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
    -- Executar a requisição HTTP para o usuário específico usando a sintaxe correta do net.http_post
    SELECT * FROM net.http_post(
      url := 'https://zzijiecsvyzaqedatuip.supabase.co/functions/v1/update-tracked-prices',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6aWppZWNzdnl6YXFlZGF0dWlwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjM1Njk4NiwiZXhwIjoyMDY3OTMyOTg2fQ.ZBOBx8pF1TqXd9_UOjOZ-KjBQTfJ2WofLgpP7cGhyMM"}'::jsonb,
      body := ('{"scheduled": false, "user_id": "' || p_user_id || '", "source": "manual"}')::jsonb,
      timeout_milliseconds := 120000
    ) INTO response_result;
    
    end_time := NOW();
    duration_ms := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
    
    -- Determinar status baseado na resposta
    IF response_result.status BETWEEN 200 AND 299 THEN
      result_status := 'SUCCESS';
      result_message := 'User sync completed successfully';
    ELSE
      result_status := 'ERROR';
      result_message := 'HTTP ' || response_result.status || ': ' || COALESCE(response_result.error_message, 'Unknown error');
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

-- Corrigir função execute_sync_with_logging também
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
    -- Executar a requisição HTTP usando a sintaxe correta
    SELECT * FROM net.http_post(
      url := 'https://zzijiecsvyzaqedatuip.supabase.co/functions/v1/update-tracked-prices',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6aWppZWNzdnl6YXFlZGF0dWlwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjM1Njk4NiwiZXhwIjoyMDY3OTMyOTg2fQ.ZBOBx8pF1TqXd9_UOjOZ-KjBQTfJ2WofLgpP7cGhyMM"}'::jsonb,
      body := '{"scheduled": true, "source": "cron"}'::jsonb,
      timeout_milliseconds := 120000
    ) INTO response_result;
    
    end_time := NOW();
    duration_ms := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
    
    -- Determinar status baseado na resposta
    IF response_result.status BETWEEN 200 AND 299 THEN
      result_status := 'SUCCESS';
      result_message := 'Execution completed successfully';
    ELSE
      result_status := 'ERROR';
      result_message := 'HTTP ' || response_result.status || ': ' || COALESCE(response_result.error_message, 'Unknown error');
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

-- Limpar cron jobs duplicados e recriar de forma mais organizada
SELECT cron.unschedule('update-tracked-prices-job');
SELECT cron.unschedule('update-prices-user-45533244-e052-4bb5-8b88-75ea2be750ec');

-- Recriar job principal usando a função corrigida
SELECT cron.schedule(
  'global-sync-job',
  '*/5 * * * *',
  'SELECT public.execute_sync_with_logging();'
);

-- Criar função para limpeza de logs antigos (manter apenas últimos 30 dias)
CREATE OR REPLACE FUNCTION public.cleanup_old_sync_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  DELETE FROM sync_execution_log 
  WHERE executed_at < NOW() - INTERVAL '30 days';
END;
$function$;

-- Agendar limpeza diária de logs
SELECT cron.schedule(
  'cleanup-sync-logs',
  '0 2 * * *', -- 2h da manhã todos os dias
  'SELECT public.cleanup_old_sync_logs();'
);