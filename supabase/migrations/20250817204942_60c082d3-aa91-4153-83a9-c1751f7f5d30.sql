-- Clean up orphaned system execution logs
UPDATE public.system_execution_logs 
SET 
  status = 'error',
  ended_at = NOW(),
  error_message = 'Execution terminated due to system cleanup',
  details = COALESCE(details, '{}')::jsonb || '{"cleanup_reason": "orphaned_running_status"}'::jsonb
WHERE status = 'running' 
  AND function_name = 'update-tracked-prices'
  AND started_at < NOW() - INTERVAL '10 minutes';