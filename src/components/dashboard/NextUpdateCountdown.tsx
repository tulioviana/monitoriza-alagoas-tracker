import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Clock, RefreshCw, Info, Activity, Zap, Play } from 'lucide-react';
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
      <Card className="mb-6 bg-gradient-to-r from-background to-background/50 border-primary/20 shadow-lg hover:shadow-xl transition-all duration-300">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 shadow-inner">
                {getIcon(state.status)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-lg">Monitor de Atualizações</h3>
                  {getStatusBadge(state.status)}
                </div>
                <p className="text-sm text-muted-foreground">
                  {state.itemsCount} {state.itemsCount === 1 ? 'item monitorado' : 'itens monitorados'}
                  {state.pendingFirstUpdate > 0 && (
                    <span className="text-amber-600 ml-2">
                      ({state.pendingFirstUpdate} aguardando primeira atualização)
                    </span>
                  )}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Manual Update Button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={executeManualUpdate}
                    disabled={!canExecute || isExecuting || trackedItems.length === 0}
                    className="relative"
                  >
                    {isExecuting ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                    {!canExecute && cooldownTimeLeft > 0 && (
                      <span className="ml-1 text-xs">({cooldownTimeLeft}s)</span>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="max-w-sm">
                  <div className="space-y-1">
                    <p><strong>Teste Manual</strong></p>
                    {trackedItems.length === 0 ? (
                      <p className="text-amber-600">Adicione itens ao monitoramento primeiro</p>
                    ) : isExecuting ? (
                      <p>Executando atualização...</p>
                    ) : !canExecute ? (
                      <p>Aguarde {cooldownTimeLeft}s para executar novamente</p>
                    ) : (
                      <p>Força a execução imediata da função de atualização de preços para teste</p>
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

              {/* Info Button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Info className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="max-w-sm">
                  <div className="space-y-2">
                    <p><strong>Atualização:</strong> Diariamente às 06:00 UTC (03:00 Brasília)</p>
                    {state.lastUpdateTime && (
                      <p><strong>Última atualização:</strong> {formatRelativeTime(state.lastUpdateTime)}</p>
                    )}
                    <p><strong>Próxima atualização:</strong> {formatExactDateTime(state.nextUpdateTime)}</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          <div className="space-y-4">
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Progresso até próxima atualização</span>
                <span className="text-sm font-medium">{Math.round(state.progressPercentage)}%</span>
              </div>
              <Progress 
                value={state.progressPercentage} 
                className="h-2 bg-gradient-to-r from-muted to-muted/50"
              />
            </div>

            {/* Countdown Display */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Tempo restante</p>
                  <p className={`text-3xl font-mono font-bold tracking-wider ${getStatusColor(state.status)} transition-colors duration-300`}>
                    {state.timeLeft}
                  </p>
                </div>
                
                {state.status === 'countdown' && state.timeLeft.includes(':') && (
                  <div className="text-xs text-muted-foreground">
                    <p>min:seg</p>
                  </div>
                )}
              </div>

              {state.lastUpdateTime && (
                <div className="text-right">
                  <p className="text-sm font-medium text-muted-foreground">Última atualização</p>
                  <p className="text-sm text-foreground">
                    {formatRelativeTime(state.lastUpdateTime)}
                  </p>
                </div>
              )}
            </div>

            {/* Status Information */}
            {state.status === 'waiting-first' && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/50">
                <Clock className="h-4 w-4 text-amber-600" />
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Aguardando primeira execução do sistema de monitoramento às 06:00 UTC.
                </p>
              </div>
            )}

            {/* Schedule Information */}
            <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200 dark:bg-blue-950/20 dark:border-blue-900/50">
              <Clock className="h-4 w-4 text-blue-600" />
              <div className="text-sm text-blue-700 dark:text-blue-300">
                <p className="font-medium">Próxima atualização: {formatExactDateTime(state.nextUpdateTime)}</p>
                <p className="text-xs mt-1">Horário fixo: 06:00 UTC (03:00 Brasília) - Todos os dias</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}