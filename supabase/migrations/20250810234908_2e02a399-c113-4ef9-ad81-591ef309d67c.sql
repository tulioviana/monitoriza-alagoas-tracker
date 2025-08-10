-- Create new cron job for update-tracked-prices function
SELECT cron.schedule(
  'update-tracked-prices-daily',
  '0 6 * * *', -- Every day at 6 AM
  $$
  SELECT
    net.http_post(
        url:='https://zzijiecsvyzaqedatuip.supabase.co/functions/v1/update-tracked-prices',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6aWppZWNzdnl6YXFlZGF0dWlwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNjE4NjQzOCwiZXhwIjoyMDUxNzYyNDM4fQ.2wOOiPEfN6ZOyuOfIJmWqPgRAeUMUd6m7YGVhzBRTQ8"}'::jsonb,
        body:='{"execution_type": "automatic", "timestamp": "' || now() || '"}'::jsonb
    ) as request_id;
  $$
);