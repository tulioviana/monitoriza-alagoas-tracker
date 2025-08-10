-- Verify cron job is active and check if there are any issues
SELECT 
  jobname, 
  schedule, 
  command, 
  active,
  nodename,
  nodeport,
  database,
  username,
  jobid
FROM cron.job 
WHERE jobname ILIKE '%update%' OR jobname ILIKE '%tracked%' OR jobname ILIKE '%price%';