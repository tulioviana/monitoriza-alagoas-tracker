-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create cron job to update tracked prices every 30 minutes
SELECT cron.schedule(
  'update-tracked-prices-job',
  '*/30 * * * *', -- Every 30 minutes
  $$
  SELECT
    net.http_post(
        url:='https://zzijiecsvyzaqedatuip.supabase.co/functions/v1/update-tracked-prices',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6aWppZWNzdnl6YXFlZGF0dWlwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjM1Njk4NiwiZXhwIjoyMDY3OTMyOTg2fQ.ZBOBx8pF1TqXd9_UOjOZ-KjBQTfJ2WofLgpP7cGhyMM"}'::jsonb,
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);

-- Create a function to check cron job status
CREATE OR REPLACE FUNCTION check_cron_jobs()
RETURNS TABLE(jobname text, schedule text, active boolean) 
LANGUAGE sql
AS $$
  SELECT jobname, schedule, active FROM cron.job WHERE jobname LIKE '%update-tracked-prices%';
$$;