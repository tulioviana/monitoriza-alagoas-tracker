-- Clean up orphaned system execution logs with correct column names
UPDATE public.system_execution_logs 
SET 
  status = 'error',
  finished_at = NOW(),
  error_message = 'Execution terminated due to system cleanup - orphaned running status'
WHERE status = 'running' 
  AND function_name = 'update-tracked-prices'
  AND started_at < NOW() - INTERVAL '10 minutes';