-- Remove old problematic cron jobs that reference non-existent functions
SELECT cron.unschedule('global-sync-job');
SELECT cron.unschedule('optimized-price-sync');
SELECT cron.unschedule('update-prices-user-45533244-e052-4bb5-8b88-75ea2be750ec');

-- Keep only the valid jobs
-- The update-tracked-prices-daily job is already correctly configured
-- The cleanup jobs are working fine

-- Also clean up any orphaned sync logs that might be causing issues
DROP TABLE IF EXISTS public.sync_execution_log;