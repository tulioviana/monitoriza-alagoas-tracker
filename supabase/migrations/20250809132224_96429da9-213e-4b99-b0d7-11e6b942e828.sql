-- ETAPA 1: Adicionar campos establishment_cnpj e establishment_name na tabela tracked_items
ALTER TABLE public.tracked_items 
ADD COLUMN establishment_cnpj TEXT,
ADD COLUMN establishment_name TEXT;

-- Criar índice para melhor performance nas consultas por CNPJ
CREATE INDEX idx_tracked_items_establishment_cnpj ON public.tracked_items(establishment_cnpj);

-- ETAPA 5: Migração de dados existentes - tentar recuperar informações do price_history
UPDATE public.tracked_items 
SET 
  establishment_cnpj = (
    SELECT establishment_cnpj 
    FROM public.price_history 
    WHERE price_history.tracked_item_id = tracked_items.id 
    ORDER BY fetch_date DESC 
    LIMIT 1
  ),
  establishment_name = (
    SELECT establishment_name 
    FROM public.price_history 
    WHERE price_history.tracked_item_id = tracked_items.id 
    ORDER BY fetch_date DESC 
    LIMIT 1
  )
WHERE establishment_cnpj IS NULL OR establishment_name IS NULL;