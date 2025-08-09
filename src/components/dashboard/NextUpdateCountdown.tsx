import { useState, useEffect } from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Clock, RefreshCw, Info, Activity, Zap, CheckCircle, Loader2 } from 'lucide-react';
import { useTrackedItems } from '@/hooks/useTrackedItems';
import { useManualPriceUpdate } from '@/hooks/useManualPriceUpdate';
import { formatRelativeTime, formatExactDateTime } from '@/lib/dateUtils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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

  const executeUpdate = () => {
    executeManualUpdate();
  };

  const formatTime = (timeLeft: string) => {
    return timeLeft;
  };
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
    <div className="bg-gradient-primary border border-primary/20 rounded-lg shadow-strong p-6 mb-8">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        {/* Mission Control Header */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center">
              {getIcon(state.status)}
            </div>
            {state.status === 'updating' && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-warning rounded-full pulse-success"></div>
            )}
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-white">Centro de Controle</h2>
              {getStatusBadge(state.status)}
            </div>
            
            <div className="flex items-center gap-4 text-white/80">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span className="text-sm">
                  {state.status === 'waiting-first' ? (
                    'Sistema inicializando...'
                  ) : state.status === 'updating' ? (
                    'Sincronizando dados em tempo real'
                  ) : state.status === 'completed' ? (
                    'Todos os preços atualizados'
                  ) : (
                    `Próxima sincronização em ${formatTime(state.timeLeft)}`
                  )}
                </span>
              </div>
              
              {state.lastUpdateTime && (
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">
                    Última: {format(state.lastUpdateTime, 'HH:mm', { locale: ptBR })}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Center */}
        <div className="flex flex-col sm:flex-row items-center gap-4">
          {/* Progress Indicator */}
          {state.status === 'countdown' && (
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2">
              <Progress value={state.progressPercentage} className="w-32 h-2" />
              <span className="text-sm text-white font-medium">{Math.round(state.progressPercentage)}%</span>
            </div>
          )}
          
          {/* Manual Update CTA */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={isExecuting ? "secondary" : "outline"}
                  size="lg"
                  onClick={executeUpdate}
                  disabled={isExecuting || (cooldownTimeLeft > 0)}
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:scale-105 transition-all duration-300 font-semibold min-w-[160px]"
                >
                  {isExecuting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      Sincronizando...
                    </>
                  ) : cooldownTimeLeft > 0 ? (
                    <>
                      <Clock className="h-5 w-5 mr-2" />
                      Aguarde {cooldownTimeLeft}s
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-5 w-5 mr-2" />
                      Sincronizar Agora
                    </>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isExecuting ? 'Atualizando todos os preços monitorados...' : 
                 cooldownTimeLeft > 0 ? `Sistema em cooldown por mais ${cooldownTimeLeft} segundos` : 
                 'Forçar atualização de todos os preços monitorados'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
}