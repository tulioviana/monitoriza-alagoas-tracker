-- Solution 1: Remove establishment columns from search_history to optimize storage
ALTER TABLE public.search_history 
DROP COLUMN IF EXISTS establishment_cnpj,
DROP COLUMN IF EXISTS establishment_name;

-- Solution 2: Implement TTL (30-day retention) for search history
-- Create function to clean up old search history records
CREATE OR REPLACE FUNCTION public.cleanup_old_search_history()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete records older than 30 days
    DELETE FROM public.search_history 
    WHERE created_at < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log the cleanup operation
    RAISE LOG 'Cleaned up % old search history records', deleted_count;
    
    RETURN deleted_count;
END;
$function$;

-- Create index on created_at for better performance during cleanup
CREATE INDEX IF NOT EXISTS idx_search_history_created_at 
ON public.search_history (created_at);

-- Schedule the cleanup function to run daily at 2 AM
SELECT cron.schedule(
    'cleanup-search-history-daily',
    '0 2 * * *', -- Daily at 2 AM
    $$
    SELECT public.cleanup_old_search_history();
    $$
);