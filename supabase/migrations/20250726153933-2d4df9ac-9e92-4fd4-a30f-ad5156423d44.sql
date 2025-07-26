-- Adicionar campos faltantes na tabela system_settings
ALTER TABLE public.system_settings 
ADD COLUMN IF NOT EXISTS search_radius integer DEFAULT 10,
ADD COLUMN IF NOT EXISTS max_items integer DEFAULT 50;

-- Atualizar registros existentes com valores padrão se necessário
UPDATE public.system_settings 
SET 
  search_radius = COALESCE(search_radius, 10),
  max_items = COALESCE(max_items, 50)
WHERE search_radius IS NULL OR max_items IS NULL;