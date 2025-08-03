-- Criar tabela de status de sincronização
CREATE TABLE IF NOT EXISTS public.sync_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'idle',
  progress integer DEFAULT 0,
  total_items integer DEFAULT 0,
  current_item text,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  error_message text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sync_status ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own sync status" 
ON public.sync_status 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sync status" 
ON public.sync_status 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sync status" 
ON public.sync_status 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Trigger para updated_at
CREATE TRIGGER update_sync_status_updated_at
  BEFORE UPDATE ON public.sync_status
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Índice para performance
CREATE INDEX IF NOT EXISTS idx_sync_status_user_id ON public.sync_status(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_status_status ON public.sync_status(status);

-- Função para iniciar sync assíncrono (sem esperar resposta)
CREATE OR REPLACE FUNCTION public.force_user_sync_async(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  request_id bigint;
  sync_id uuid;
BEGIN
  -- Criar ou atualizar status de sync
  INSERT INTO sync_status (user_id, status, started_at)
  VALUES (p_user_id, 'running', NOW())
  ON CONFLICT (user_id) DO UPDATE SET
    status = 'running',
    started_at = NOW(),
    progress = 0,
    total_items = 0,
    current_item = NULL,
    completed_at = NULL,
    error_message = NULL,
    updated_at = NOW()
  RETURNING id INTO sync_id;

  -- Fazer chamada HTTP assíncrona (sem esperar)
  SELECT net.http_post(
    url := 'https://zzijiecsvyzaqedatuip.supabase.co/functions/v1/update-tracked-prices',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6aWppZWNzdnl6YXFlZGF0dWlwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjM1Njk4NiwiZXhwIjoyMDY3OTMyOTg2fQ.ZBOBx8pF1TqXd9_UOjOZ-KjBQTfJ2WofLgpP7cGhyMM"}'::jsonb,
    body := ('{"scheduled": false, "user_id": "' || p_user_id || '", "source": "user_manual", "sync_id": "' || sync_id || '"}')::jsonb
  ) INTO request_id;

  -- Log do início
  INSERT INTO sync_execution_log (
    executed_at, 
    execution_type, 
    status, 
    duration_ms,
    response_body
  ) VALUES (
    NOW(), 
    'user_manual', 
    'STARTED_ASYNC', 
    0,
    'User: ' || p_user_id || ' - Async sync started - Request ID: ' || request_id || ' - Sync ID: ' || sync_id
  );

  RETURN 'ASYNC_STARTED: Sincronização iniciada com sucesso. ID: ' || sync_id;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Atualizar status com erro
    UPDATE sync_status 
    SET status = 'error', 
        error_message = SQLERRM,
        completed_at = NOW(),
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    RETURN 'ERROR: ' || SQLERRM;
END;
$function$;

-- Função para obter status do sync
CREATE OR REPLACE FUNCTION public.get_user_sync_status(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  status_record RECORD;
  result jsonb;
BEGIN
  SELECT *
  FROM sync_status
  WHERE user_id = p_user_id
  ORDER BY updated_at DESC
  LIMIT 1
  INTO status_record;
  
  IF FOUND THEN
    result := jsonb_build_object(
      'id', status_record.id,
      'status', status_record.status,
      'progress', status_record.progress,
      'total_items', status_record.total_items,
      'current_item', status_record.current_item,
      'started_at', status_record.started_at,
      'completed_at', status_record.completed_at,
      'error_message', status_record.error_message,
      'updated_at', status_record.updated_at
    );
  ELSE
    result := jsonb_build_object(
      'status', 'idle',
      'progress', 0,
      'total_items', 0
    );
  END IF;
  
  RETURN result;
END;
$function$;

-- Atualizar a função force_user_sync original para usar a nova implementação
CREATE OR REPLACE FUNCTION public.force_user_sync(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Usar a nova implementação assíncrona
  RETURN public.force_user_sync_async(p_user_id);
END;
$function$;