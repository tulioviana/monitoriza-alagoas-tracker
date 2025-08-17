import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';

interface UpdateResult {
  success: boolean;
  message: string;
  items_processed: number;
  successful_updates: number;
  failed_updates: number;
  errors?: string[];
}

export function useManualPriceUpdate() {
  const [isExecuting, setIsExecuting] = useState(false);
  const [lastExecution, setLastExecution] = useState<Date | null>(null);
  const [executionResult, setExecutionResult] = useState<UpdateResult | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const canExecute = () => {
    if (!lastExecution) return true;
    const cooldownMs = 30 * 1000; // 30 seconds cooldown
    return Date.now() - lastExecution.getTime() > cooldownMs;
  };

  const getCooldownTimeLeft = (): number => {
    if (!lastExecution) return 0;
    const cooldownMs = 30 * 1000;
    const timeLeft = cooldownMs - (Date.now() - lastExecution.getTime());
    return Math.max(0, Math.ceil(timeLeft / 1000));
  };

  const executeManualUpdate = async () => {
    if (!canExecute()) {
      const timeLeft = getCooldownTimeLeft();
      toast({
        title: "Aguarde",
        description: `Você poderá executar novamente em ${timeLeft} segundos`,
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Erro de autenticação",
        description: "Você precisa estar logado para executar esta ação",
        variant: "destructive",
      });
      return;
    }

    setIsExecuting(true);
    setExecutionResult(null);
    
    const startTime = Date.now();
    
    toast({
      title: "Atualização iniciada",
      description: "Executando atualização manual dos seus itens monitorados...",
    });

    try {
      // Use direct fetch instead of supabase.functions.invoke to ensure proper JSON serialization
      const response = await fetch(`https://zzijiecsvyzaqedatuip.supabase.co/functions/v1/update-tracked-prices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6aWppZWNzdnl6YXFlZGF0dWlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNTY5ODYsImV4cCI6MjA2NzkzMjk4Nn0.QGm_1PVmP6s9mJtchkIGeQ_Hj6cq-6352aKiDBVcdXk',
        },
        body: JSON.stringify({
          user_id: user.id,
          execution_type: 'manual'
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Edge function HTTP error:', response.status, errorText);
        toast({
          title: "Erro na execução",
          description: `Falha ao executar a função: ${response.status} - ${errorText}`,
          variant: "destructive",
        });
        return;
      }

      const data = await response.json();

      const executionTime = Math.round((Date.now() - startTime) / 1000);
      const result = data as UpdateResult;
      setExecutionResult(result);
      setLastExecution(new Date());

      // Refresh tracked items data
      queryClient.invalidateQueries({ queryKey: ['tracked-items'] });

      const successRate = result.items_processed > 0 
        ? Math.round((result.successful_updates / result.items_processed) * 100)
        : 0;

      if (result.success && result.successful_updates > 0) {
        toast({
          title: "Atualização concluída",
          description: `✅ ${result.successful_updates}/${result.items_processed} itens atualizados (${successRate}%) em ${executionTime}s`,
        });
      } else if (result.success && result.successful_updates === 0) {
        toast({
          title: "Atualização concluída com problemas",
          description: `⚠️ 0/${result.items_processed} itens atualizados. Verifique os logs para mais detalhes.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Falha na atualização",
          description: `❌ Erro no processamento. ${result.failed_updates || 0} falhas detectadas.`,
          variant: "destructive",
        });
      }

      console.log('Manual update result:', result);

    } catch (error) {
      console.error('Error executing manual update:', error);
      toast({
        title: "Erro inesperado",
        description: "Ocorreu um erro inesperado durante a execução. Verifique os logs.",
        variant: "destructive",
      });
    } finally {
      setIsExecuting(false);
    }
  };

  return {
    executeManualUpdate,
    isExecuting,
    canExecute: canExecute(),
    cooldownTimeLeft: getCooldownTimeLeft(),
    lastExecution,
    executionResult,
  };
}