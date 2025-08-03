-- Step 1: Fix SQL functions to work with pg_net async calls
-- Drop existing problematic functions first
DROP FUNCTION IF EXISTS public.execute_sync_with_logging();
DROP FUNCTION IF EXISTS public.execute_user_sync(uuid);

-- Create improved sync function with proper pg_net handling
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
      
      -- Wait 1 second before next check
      PERFORM pg_sleep(1);
      wait_time := wait_time + 1;
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

-- Create improved user sync function
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
  max_wait_time INTEGER := 120; -- 2 minutes timeout
  wait_time INTEGER := 0;
BEGIN
  start_time := NOW();
  
  BEGIN
    -- Make async HTTP request for specific user
    SELECT net.http_post(
      url := 'https://zzijiecsvyzaqedatuip.supabase.co/functions/v1/update-tracked-prices',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6aWppZWNzdnl6YXFlZGF0dWlwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjM1Njk4NiwiZXhwIjoyMDY3OTMyOTg2fQ.ZBOBx8pF1TqXd9_UOjOZ-KjBQTfJ2WofLgpP7cGhyMM"}'::jsonb,
      body := ('{"scheduled": false, "user_id": "' || p_user_id || '", "source": "manual"}')::jsonb
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
      
      -- Wait 1 second before next check
      PERFORM pg_sleep(1);
      wait_time := wait_time + 1;
    END LOOP;
    
    end_time := NOW();
    duration_ms := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
    
    -- Determine status based on response
    IF response_record.id IS NULL THEN
      result_status := 'TIMEOUT';
      result_message := 'User sync timed out after ' || max_wait_time || ' seconds';
    ELSIF response_record.status_code BETWEEN 200 AND 299 THEN
      result_status := 'SUCCESS';
      result_message := 'User sync completed successfully';
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
      'manual', 
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
        'manual', 
        'EXECUTION_ERROR', 
        duration_ms,
        'User sync error for ' || p_user_id || ': ' || SQLERRM
      );
      
      RETURN 'EXECUTION_ERROR: ' || SQLERRM;
  END;
END;
$function$;

-- Step 2: Clean up existing cron jobs and create optimized ones
-- Remove all existing problematic cron jobs
SELECT cron.unschedule(jobname) FROM cron.job WHERE jobname LIKE '%update%';

-- Create optimized main sync job (every 30 minutes)
SELECT cron.schedule(
  'optimized-price-sync',
  '*/30 * * * *', -- Every 30 minutes
  'SELECT public.execute_sync_with_logging();'
);

-- Create daily cleanup job for old logs
SELECT cron.schedule(
  'cleanup-sync-logs',
  '0 2 * * *', -- Daily at 2 AM
  'SELECT public.cleanup_old_sync_logs();'
);

-- Step 3: Create system health check function
CREATE OR REPLACE FUNCTION public.check_sync_system_health()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  result jsonb := '{}';
  last_success TIMESTAMP;
  last_execution TIMESTAMP;
  error_count INTEGER;
  active_items INTEGER;
BEGIN
  -- Check last successful execution
  SELECT executed_at INTO last_success
  FROM sync_execution_log 
  WHERE status = 'SUCCESS' 
  ORDER BY executed_at DESC 
  LIMIT 1;
  
  -- Check last execution (any status)
  SELECT executed_at INTO last_execution
  FROM sync_execution_log 
  ORDER BY executed_at DESC 
  LIMIT 1;
  
  -- Count recent errors (last 24 hours)
  SELECT COUNT(*) INTO error_count
  FROM sync_execution_log 
  WHERE status IN ('ERROR', 'TIMEOUT', 'EXECUTION_ERROR')
    AND executed_at > NOW() - INTERVAL '24 hours';
  
  -- Count active tracked items
  SELECT COUNT(*) INTO active_items
  FROM tracked_items 
  WHERE is_active = true;
  
  -- Build result object
  result := jsonb_build_object(
    'last_success', last_success,
    'last_execution', last_execution,
    'recent_errors_24h', error_count,
    'active_items', active_items,
    'system_status', CASE 
      WHEN last_success IS NULL THEN 'CRITICAL'
      WHEN last_success < NOW() - INTERVAL '2 hours' THEN 'WARNING'
      WHEN error_count > 5 THEN 'WARNING'
      ELSE 'HEALTHY'
    END,
    'checked_at', NOW()
  );
  
  RETURN result;
END;
$function$;