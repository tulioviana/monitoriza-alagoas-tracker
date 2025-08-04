-- Create new cron job to call the update-tracked-prices Edge Function every 5 minutes
SELECT cron.schedule(
  'update-tracked-prices-job',
  '*/5 * * * *', -- Every 5 minutes
  $$
  SELECT
    net.http_post(
        url:='https://zzijiecsvyzaqedatuip.supabase.co/functions/v1/update-tracked-prices',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6aWppZWNzdnl6YXFlZGF0dWlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNTY5ODYsImV4cCI6MjA2NzkzMjk4Nn0.QGm_1PVmP6s9mJtchkIGeQ_Hj6cq-6352aKiDBVcdXk"}'::jsonb,
        body:='{"source": "cron"}'::jsonb
    ) as request_id;
  $$
);