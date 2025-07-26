-- Forçar recriação do cron job com a nova função
-- Primeiro remover o job existente se houver
SELECT cron.unschedule('update-tracked-prices-job');

-- Criar o job usando a nova função com logs
SELECT cron.schedule(
  'update-tracked-prices-job',
  '*/5 * * * *',
  'SELECT public.execute_sync_with_logging();'
);