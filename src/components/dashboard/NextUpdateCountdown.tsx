import { useState, useEffect } from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Clock, RefreshCw, Info, Activity, Zap } from 'lucide-react';
import { useTrackedItems } from '@/hooks/useTrackedItems';
import { useManualPriceUpdate } from '@/hooks/useManualPriceUpdate';
import { formatRelativeTime, formatExactDateTime } from '@/lib/dateUtils';

type UpdateStatus = 'waiting-first' | 'countdown' | 'updating' | 'completed';

interface CountdownState {
  timeLeft: string;
  progressPercentage: number;
  status: UpdateStatus;
  nextUpdateTime: Date;
  lastUpdateTime: Date | null;
  itemsCount: number;
  pendingFirstUpdate: number;
}

// Fixed daily update time: 06:00 UTC (03:00 Brasília)
const DAILY_UPDATE_HOUR = 6;
const DAILY_UPDATE_MINUTE = 0;

export function NextUpdateCountdown() {
  const { trackedItems } = useTrackedItems();
  const { 
    executeManualUpdate, 
    isExecuting, 
    canExecute, 
    cooldownTimeLeft,
    executionResult 
  } = useManualPriceUpdate();
  const [state, setState] = useState<CountdownState>({
    timeLeft: '--:--',
    progressPercentage: 0,
    status: 'waiting-first',
    nextUpdateTime: new Date(),
    lastUpdateTime: null,
    itemsCount: 0,
    pendingFirstUpdate: 0
  });

  useEffect(() => {
    if (trackedItems.length === 0) {
      setState(prev => ({ ...prev, timeLeft: '--:--', status: 'waiting-first' }));
      return;
    }

    const calculateState = () => {
      const now = new Date();
      const itemsCount = trackedItems.length;
      const pendingFirstUpdate = trackedItems.filter(item => !item.last_updated_at).length;
      
      // Calculate next update time (next 06:00 UTC)
      const nextUpdate = new Date();
      nextUpdate.setUTCHours(DAILY_UPDATE_HOUR, DAILY_UPDATE_MINUTE, 0, 0);
      
      // If we've passed today's update time, move to tomorrow
      if (now >= nextUpdate) {
        nextUpdate.setUTCDate(nextUpdate.getUTCDate() + 1);
      }

      // Find the most recent update among all items
      const mostRecentUpdate = trackedItems.reduce((latest, item) => {
        const itemTime = item.last_updated_at ? new Date(item.last_updated_at).getTime() : 0;
        return itemTime > latest ? itemTime : latest;
      }, 0);

      const lastUpdateTime = mostRecentUpdate > 0 ? new Date(mostRecentUpdate) : null;
      
      // Check if we're currently in update window (06:00-06:05 UTC)
      const isUpdateTime = now.getUTCHours() === DAILY_UPDATE_HOUR && now.getUTCMinutes() < 5;
      
      if (isUpdateTime) {
        setState({
          timeLeft: 'Atualizando agora...',
          progressPercentage: 100,
          status: 'updating',
          nextUpdateTime: nextUpdate,
          lastUpdateTime,
          itemsCount,
          pendingFirstUpdate
        });
        return;
      }

      // Calculate time until next update
      const timeDiff = nextUpdate.getTime() - now.getTime();
      const totalDayMs = 24 * 60 * 60 * 1000;
      const elapsed = totalDayMs - timeDiff;
      const progressPercentage = (elapsed / totalDayMs) * 100;

      // Format time remaining
      const hours = Math.floor(timeDiff / (1000 * 60 * 60));
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);
      
      let timeLeft: string;
      if (hours > 0) {
        timeLeft = `${hours}h ${minutes.toString().padStart(2, '0')}m`;
      } else {
        timeLeft = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      }

      const status = pendingFirstUpdate === itemsCount ? 'waiting-first' : 'countdown';

      setState({
        timeLeft,
        progressPercentage,
        status,
        nextUpdateTime: nextUpdate,
        lastUpdateTime,
        itemsCount,
        pendingFirstUpdate
      });
    };

    calculateState();
    const interval = setInterval(calculateState, 1000);
    return () => clearInterval(interval);
  }, [trackedItems]);

  if (trackedItems.length === 0) {
    return null;
  }

  const getStatusColor = (status: UpdateStatus) => {
    switch (status) {
      case 'countdown': return 'text-primary';
      case 'updating': return 'text-blue-500';
      case 'waiting-first': return 'text-amber-500';
      case 'completed': return 'text-green-500';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusBadge = (status: UpdateStatus) => {
    switch (status) {
      case 'countdown': return <Badge variant="default" className="animate-pulse">Ativo</Badge>;
      case 'updating': return <Badge variant="secondary" className="bg-blue-100 text-blue-700">Atualizando</Badge>;
      case 'waiting-first': return <Badge variant="outline" className="border-amber-300 text-amber-700">Aguardando</Badge>;
      case 'completed': return <Badge variant="secondary" className="bg-green-100 text-green-700">Concluído</Badge>;
      default: return null;
    }
  };

  const getIcon = (status: UpdateStatus) => {
    switch (status) {
      case 'countdown': return <Activity className="h-5 w-5 text-primary animate-pulse" />;
      case 'updating': return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'waiting-first': return <Clock className="h-5 w-5 text-amber-500" />;
      case 'completed': return <Zap className="h-5 w-5 text-green-500" />;
      default: return <Clock className="h-5 w-5" />;
    }
  };

  return (
    <TooltipProvider>
      {/* Compact Header Bar */}
      <div className="mb-6 p-4 bg-gradient-surface border border-card-border rounded-lg shadow-medium hover:shadow-strong transition-all duration-300">
        <div className="flex items-center justify-between">
          {/* Left Section - Next Automatic Update Info */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-gradient-secondary">
              {getIcon(state.status)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  Próxima atualização do sistema em {state.timeLeft}
                </span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{formatExactDateTime(state.nextUpdateTime)}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              {state.lastUpdateTime && (
                <div className="text-xs text-muted-foreground">
                  Última atualização {formatRelativeTime(state.lastUpdateTime)}
                </div>
              )}
            </div>
          </div>

          {/* Right Section - Manual Update Action */}
          <div className="flex items-center gap-2">
            <Progress 
              value={state.progressPercentage} 
              className="w-24 h-2"
            />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={executeManualUpdate}
                  disabled={!canExecute || isExecuting || trackedItems.length === 0}
                  className="relative"
                  size="sm"
                >
                  {isExecuting ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                      Atualizando...
                    </>
                  ) : !canExecute && cooldownTimeLeft > 0 ? (
                    <>
                      <Clock className="h-4 w-4 mr-2" />
                      Aguarde {cooldownTimeLeft}s
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Atualizar Agora
                    </>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                <div className="space-y-1">
                  <p><strong>Atualização Manual</strong></p>
                  {trackedItems.length === 0 ? (
                    <p className="text-amber-600">Adicione itens ao monitoramento primeiro</p>
                  ) : isExecuting ? (
                    <p>Executando atualização dos seus itens...</p>
                  ) : !canExecute ? (
                    <p>Aguarde {cooldownTimeLeft}s para executar novamente</p>
                  ) : (
                    <p>Força a atualização imediata dos preços dos seus itens monitorados</p>
                  )}
                  {executionResult && (
                    <div className="mt-2 pt-2 border-t">
                      <p className="text-xs">Último resultado:</p>
                      <p className="text-xs">
                        ✅ {executionResult.successful_updates}/{executionResult.items_processed} atualizados
                      </p>
                    </div>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}