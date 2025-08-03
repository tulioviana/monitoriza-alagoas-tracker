-- FASE 2: REMOÇÃO COMPLETA DO BACKEND - TRACKED ITEMS FUNCTIONALITY
-- =====================================================================

-- 1. Remover todas as funções SQL relacionadas ao sync e tracked items
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS public.get_user_cron_jobs(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_sync_logs(uuid, integer) CASCADE;
DROP FUNCTION IF EXISTS public.get_recent_sync_logs(integer) CASCADE;
DROP FUNCTION IF EXISTS public.check_cron_jobs() CASCADE;
DROP FUNCTION IF EXISTS public.check_sync_system_health() CASCADE;
DROP FUNCTION IF EXISTS public.repair_user_sync(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.cleanup_old_sync_logs() CASCADE;
DROP FUNCTION IF EXISTS public.update_monitoring_cron_job(uuid, boolean, text) CASCADE;
DROP FUNCTION IF EXISTS public.execute_user_sync(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.force_user_sync(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.repair_all_user_cron_jobs() CASCADE;
DROP FUNCTION IF EXISTS public.cleanup_orphaned_cron_jobs() CASCADE;
DROP FUNCTION IF EXISTS public.execute_sync_with_logging() CASCADE;
DROP FUNCTION IF EXISTS public.test_user_sync_system(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_sync_status(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.force_user_sync_async(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.diagnose_sync_system(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.force_user_sync_robust(uuid) CASCADE;

-- 2. Remover tabelas em ordem correta para evitar conflitos de FK
-- Primeiro: price_history (depende de tracked_items)
DROP TABLE IF EXISTS public.price_history CASCADE;

-- Segundo: competitor_price_history (depende de competitor_tracking)
DROP TABLE IF EXISTS public.competitor_price_history CASCADE;

-- Terceiro: competitor_tracking
DROP TABLE IF EXISTS public.competitor_tracking CASCADE;

-- Quarto: sync_status
DROP TABLE IF EXISTS public.sync_status CASCADE;

-- Quinto: tracked_items (tabela principal)
DROP TABLE IF EXISTS public.tracked_items CASCADE;

-- 3. Limpar logs de sync relacionados (manter tabela mas limpar dados)
DELETE FROM public.sync_execution_log 
WHERE execution_type IN ('user_cron', 'cron', 'user_manual_robust', 'migration');

-- 4. Remover tipos personalizados se existirem
DROP TYPE IF EXISTS item_type CASCADE;

-- 5. Log da migração de limpeza
INSERT INTO public.sync_execution_log (
  executed_at, 
  execution_type, 
  status, 
  duration_ms,
  response_body
) VALUES (
  NOW(), 
  'cleanup_migration', 
  'SUCCESS', 
  0,
  'Complete removal of tracked items functionality - Backend cleanup completed'
);