-- Remove duplicate system_settings records, keeping only the most recent per user
DELETE FROM public.system_settings 
WHERE id NOT IN (
    SELECT DISTINCT ON (user_id) id 
    FROM public.system_settings 
    ORDER BY user_id, created_at DESC
);