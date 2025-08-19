-- Add user_id column to system_execution_logs table
ALTER TABLE public.system_execution_logs 
ADD COLUMN user_id UUID NULL;

-- Add comment to explain the column
COMMENT ON COLUMN public.system_execution_logs.user_id IS 'ID do usuário que executou a operação (para execuções manuais/individuais)';