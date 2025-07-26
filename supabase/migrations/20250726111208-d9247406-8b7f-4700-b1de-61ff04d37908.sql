-- Update the function to support 5-minute frequency
CREATE OR REPLACE FUNCTION public.update_monitoring_cron_job(p_user_id uuid, p_enabled boolean, p_frequency text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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

  -- Create new job if enabled
  IF p_enabled THEN
    request_body := 'SELECT net.http_post(url:=''https://zzijiecsvyzaqedatuip.supabase.co/functions/v1/update-tracked-prices'', headers:=''{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6aWppZWNzdnl6YXFlZGF0dWlwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjM1Njk4NiwiZXhwIjoyMDY3OTMyOTg2fQ.ZBOBx8pF1TqXd9_UOjOZ-KjBQTfJ2WofLgpP7cGhyMM"}''::jsonb, body:=''{"scheduled": true}''::jsonb) as request_id;';
    
    PERFORM cron.schedule(job_name, cron_schedule, request_body);
  END IF;

  RETURN TRUE;
END;
$function$;