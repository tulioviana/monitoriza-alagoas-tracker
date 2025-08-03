-- Remove duplicates from sync_status table, keeping only the most recent entry per user
DELETE FROM sync_status 
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id) id 
  FROM sync_status 
  ORDER BY user_id, updated_at DESC
);

-- Add UNIQUE constraint on user_id column
ALTER TABLE sync_status 
ADD CONSTRAINT sync_status_user_id_unique UNIQUE (user_id);

-- Log the constraint addition
INSERT INTO sync_execution_log (
  executed_at, 
  execution_type, 
  status, 
  duration_ms,
  response_body
) VALUES (
  NOW(), 
  'migration', 
  'SUCCESS', 
  0,
  'Added UNIQUE constraint to sync_status.user_id - ON CONFLICT should now work properly'
);