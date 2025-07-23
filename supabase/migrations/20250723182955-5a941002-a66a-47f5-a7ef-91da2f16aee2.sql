-- Create system_settings table for monitoring configurations
CREATE TABLE public.system_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  auto_update_enabled BOOLEAN NOT NULL DEFAULT true,
  update_frequency TEXT NOT NULL DEFAULT '30m',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own system settings" 
ON public.system_settings 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own system settings" 
ON public.system_settings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own system settings" 
ON public.system_settings 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_system_settings_updated_at
BEFORE UPDATE ON public.system_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to manage cron jobs based on user settings
CREATE OR REPLACE FUNCTION public.update_monitoring_cron_job(
  p_user_id UUID,
  p_enabled BOOLEAN,
  p_frequency TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  job_name TEXT := 'update-tracked-prices-job';
  cron_schedule TEXT;
BEGIN
  -- Convert frequency to cron schedule
  CASE p_frequency
    WHEN '30m' THEN cron_schedule := '*/30 * * * *';
    WHEN '1h' THEN cron_schedule := '0 * * * *';
    WHEN '6h' THEN cron_schedule := '0 */6 * * *';
    WHEN '12h' THEN cron_schedule := '0 */12 * * *';
    WHEN '24h' THEN cron_schedule := '0 0 * * *';
    ELSE cron_schedule := '*/30 * * * *'; -- default to 30 minutes
  END CASE;

  -- Remove existing job if exists
  PERFORM cron.unschedule(job_name);

  -- Create new job if enabled
  IF p_enabled THEN
    PERFORM cron.schedule(
      job_name,
      cron_schedule,
      $$
      SELECT
        net.http_post(
            url:='https://zzijiecsvyzaqedatuip.supabase.co/functions/v1/update-tracked-prices',
            headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6aWppZWNzdnl6YXFlZGF0dWlwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjM1Njk4NiwiZXhwIjoyMDY3OTMyOTg2fQ.ZBOBx8pF1TqXd9_UOjOZ-KjBQTfJ2WofLgpP7cGhyMM"}'::jsonb,
            body:='{"scheduled": true}'::jsonb
        ) as request_id;
      $$
    );
  END IF;

  RETURN TRUE;
END;
$$;