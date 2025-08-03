-- Adicionar coluna last_updated_at na tabela tracked_items para controle individual de frequência
ALTER TABLE public.tracked_items 
ADD COLUMN last_updated_at TIMESTAMP WITH TIME ZONE;