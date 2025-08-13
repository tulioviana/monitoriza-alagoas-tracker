-- Create table to track automatic executions
CREATE TABLE IF NOT EXISTS public.system_execution_logs (
  id BIGSERIAL PRIMARY KEY,
  function_name TEXT NOT NULL,
  execution_type TEXT NOT NULL DEFAULT 'automatic', -- 'automatic' ou 'manual'
  status TEXT NOT NULL, -- 'success', 'error', 'partial'
  items_processed INTEGER DEFAULT 0,
  items_successful INTEGER DEFAULT 0,
  items_failed INTEGER DEFAULT 0,
  execution_details JSONB,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_ms INTEGER
);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_system_execution_logs_function_started 
ON public.system_execution_logs (function_name, started_at DESC);

-- Enable RLS
ALTER TABLE public.system_execution_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for admin access
CREATE POLICY "Admins can view all execution logs" 
ON public.system_execution_logs 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Function to clean old execution logs (keep last 30 days)
CREATE OR REPLACE FUNCTION public.cleanup_execution_logs()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.system_execution_logs 
    WHERE started_at < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RAISE LOG 'Cleaned up % old execution logs', deleted_count;
    
    RETURN deleted_count;
END;
$$;