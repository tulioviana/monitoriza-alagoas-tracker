-- Criar tabela para logs de execução de cron jobs
CREATE TABLE public.sync_execution_log (
  id BIGSERIAL PRIMARY KEY,
  executed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  execution_type TEXT NOT NULL DEFAULT 'cron', -- 'cron' ou 'manual'
  status TEXT NOT NULL, -- 'SUCCESS', 'ERROR', 'TIMEOUT'
  request_id UUID,
  response_body TEXT,
  error_message TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.sync_execution_log ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to view logs
CREATE POLICY "Authenticated users can view sync logs" 
ON public.sync_execution_log 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Criar função aprimorada para execução do cron job com logs detalhados
CREATE OR REPLACE FUNCTION public.execute_sync_with_logging()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result_id UUID;
  error_msg TEXT;
  start_time TIMESTAMP;
  end_time TIMESTAMP;
  duration_ms INTEGER;
  response_result RECORD;
BEGIN
  start_time := NOW();
  
  BEGIN
    -- Executar a requisição HTTP com timeout
    SELECT INTO response_result net.http_post(
      url := 'https://zzijiecsvyzaqedatuip.supabase.co/functions/v1/update-tracked-prices',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6aWppZWNzdnl6YXFlZGF0dWlwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjM1Njk4NiwiZXhwIjoyMDY3OTMyOTg2fQ.ZBOBx8pF1TqXd9_UOjOZ-KjBQTfJ2WofLgpP7cGhyMM"}'::jsonb,
      body := '{"scheduled": true, "source": "cron"}'::jsonb,
      timeout_milliseconds := 120000 -- 2 minutos de timeout
    );
    
    end_time := NOW();
    duration_ms := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
    
    -- Log do sucesso
    INSERT INTO sync_execution_log (
      executed_at, 
      execution_type, 
      status, 
      request_id, 
      response_body,
      duration_ms
    ) VALUES (
      start_time, 
      'cron', 
      'SUCCESS', 
      response_result.request_id,
      response_result.content::text,
      duration_ms
    );
    
    RETURN 'SUCCESS: Request ID ' || response_result.request_id || ' completed in ' || duration_ms || 'ms';
    
  EXCEPTION
    WHEN OTHERS THEN
      end_time := NOW();
      duration_ms := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
      error_msg := SQLERRM;
      
      -- Log do erro
      INSERT INTO sync_execution_log (
        executed_at, 
        execution_type, 
        status, 
        error_message,
        duration_ms
      ) VALUES (
        start_time, 
        'cron', 
        'ERROR', 
        error_msg,
        duration_ms
      );
      
      RETURN 'ERROR: ' || error_msg;
  END;
END;
$$;

-- Atualizar a função de cron job para usar a nova função com logs
CREATE OR REPLACE FUNCTION public.update_monitoring_cron_job(p_user_id uuid, p_enabled boolean, p_frequency text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  job_name TEXT := 'update-tracked-prices-job';
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

  -- Create new job if enabled using the new logging function
  IF p_enabled THEN
    request_body := 'SELECT public.execute_sync_with_logging();';
    PERFORM cron.schedule(job_name, cron_schedule, request_body);
  END IF;

  RETURN TRUE;
END;
$$;

-- Função para verificar status de cron jobs com permissões adequadas
CREATE OR REPLACE FUNCTION public.check_cron_jobs()
RETURNS TABLE(jobname text, schedule text, active boolean, last_run timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY 
  SELECT 
    j.jobname, 
    j.schedule, 
    j.active,
    j.last_run_started_at
  FROM cron.job j 
  WHERE j.jobname LIKE '%update-tracked-prices%';
END;
$$;

-- Função para obter logs de sincronização recentes
CREATE OR REPLACE FUNCTION public.get_recent_sync_logs(limit_count integer DEFAULT 10)
RETURNS TABLE(
  id bigint,
  executed_at timestamp with time zone,
  execution_type text,
  status text,
  duration_ms integer,
  error_message text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
  ORDER BY l.executed_at DESC 
  LIMIT limit_count;
END;
$$;