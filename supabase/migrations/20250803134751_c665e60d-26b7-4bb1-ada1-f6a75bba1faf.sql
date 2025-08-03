-- Função de teste para validar o sistema de sincronização
CREATE OR REPLACE FUNCTION public.test_user_sync_system(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  result jsonb := '{}';
  user_settings RECORD;
  cron_exists BOOLEAN := false;
  recent_logs INTEGER := 0;
  active_items INTEGER := 0;
BEGIN
  -- Verificar configurações do usuário
  SELECT auto_update_enabled, update_frequency 
  INTO user_settings
  FROM public.system_settings 
  WHERE user_id = p_user_id;
  
  -- Verificar se cron job existe
  SELECT EXISTS(
    SELECT 1 FROM cron.job 
    WHERE jobname = 'update-prices-user-' || p_user_id
  ) INTO cron_exists;
  
  -- Contar logs recentes do usuário (últimas 24h)
  SELECT COUNT(*) INTO recent_logs
  FROM public.sync_execution_log 
  WHERE executed_at > NOW() - INTERVAL '24 hours'
    AND (response_body LIKE '%' || p_user_id || '%' 
         OR error_message LIKE '%' || p_user_id || '%');
  
  -- Contar itens ativos do usuário
  SELECT COUNT(*) INTO active_items
  FROM public.tracked_items 
  WHERE user_id = p_user_id AND is_active = true;
  
  -- Construir resultado
  result := jsonb_build_object(
    'user_id', p_user_id,
    'user_settings', CASE 
      WHEN user_settings.auto_update_enabled IS NOT NULL THEN 
        jsonb_build_object(
          'auto_update_enabled', user_settings.auto_update_enabled,
          'update_frequency', user_settings.update_frequency
        )
      ELSE null 
    END,
    'cron_job_exists', cron_exists,
    'recent_logs_24h', recent_logs,
    'active_items', active_items,
    'system_ready', (
      user_settings.auto_update_enabled IS NOT NULL AND
      cron_exists AND
      active_items > 0
    ),
    'checked_at', NOW()
  );
  
  RETURN result;
END;
$function$;