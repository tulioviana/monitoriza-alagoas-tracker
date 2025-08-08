-- Remove all existing cron jobs for update-tracked-prices
SELECT cron.unschedule(jobname) 
FROM cron.job 
WHERE command LIKE '%update-tracked-prices%';

-- Also remove any jobs with similar patterns
SELECT cron.unschedule(jobname) 
FROM cron.job 
WHERE command LIKE '%invoke-function%' OR command LIKE '%http_post%';