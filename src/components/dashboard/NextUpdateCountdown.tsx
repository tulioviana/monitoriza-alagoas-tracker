import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Clock, RefreshCw, Play, Pause, Info, Activity, Zap } from 'lucide-react';
import { useMonitoringPreferences } from '@/hooks/useMonitoringPreferences';
import { useTrackedItems } from '@/hooks/useTrackedItems';
import { formatRelativeTime, formatExactDateTime } from '@/lib/dateUtils';

type UpdateStatus = 'waiting-first' | 'countdown' | 'updating' | 'paused' | 'error';

interface CountdownState {
  timeLeft: string;
  progressPercentage: number;
  status: UpdateStatus;
  nextUpdateTime: Date | null;
  lastUpdateTime: Date | null;
  itemsCount: number;
  pendingFirstUpdate: number;
}

export function NextUpdateCountdown() {
  const { preferences } = useMonitoringPreferences();
  const { trackedItems } = useTrackedItems();
  const [isPaused, setIsPaused] = useState(false);
  const [state, setState] = useState<CountdownState>({
    timeLeft: '--:--',
    progressPercentage: 0,
    status: 'waiting-first',
    nextUpdateTime: null,
    lastUpdateTime: null,
    itemsCount: 0,
    pendingFirstUpdate: 0
  });

  useEffect(() => {
    if (!preferences || trackedItems.length === 0) {
      setState(prev => ({ ...prev, timeLeft: '--:--', status: 'waiting-first' }));
      return;
    }

    if (isPaused) {
      setState(prev => ({ ...prev, status: 'paused' }));
      return;
    }

    const updateFrequencyMs = preferences.update_frequency_minutes * 60 * 1000;
    
    const calculateState = () => {
      // Estatísticas dos itens
      const itemsCount = trackedItems.length;
      const pendingFirstUpdate = trackedItems.filter(item => !item.last_updated_at).length;
      
      // Encontrar o item com a atualização mais recente
      const mostRecentUpdate = trackedItems.reduce((latest, item) => {
        const itemTime = item.last_updated_at ? new Date(item.last_updated_at).getTime() : 0;
        return itemTime > latest ? itemTime : latest;
      }, 0);

      const lastUpdateTime = mostRecentUpdate > 0 ? new Date(mostRecentUpdate) : null;

      if (mostRecentUpdate === 0) {
        setState({
          timeLeft: 'Aguardando primeira atualização',
          progressPercentage: 0,
          status: 'waiting-first',
          nextUpdateTime: null,
          lastUpdateTime: null,
          itemsCount,
          pendingFirstUpdate
        });
        return;
      }

      const nextUpdateTime = new Date(mostRecentUpdate + updateFrequencyMs);
      const now = Date.now();
      const timeDiff = nextUpdateTime.getTime() - now;

      if (timeDiff <= 0) {
        setState({
          timeLeft: 'Atualizando agora...',
          progressPercentage: 100,
          status: 'updating',
          nextUpdateTime,
          lastUpdateTime,
          itemsCount,
          pendingFirstUpdate
        });
        return;
      }

      const totalTime = updateFrequencyMs;
      const elapsed = totalTime - timeDiff;
      const progressPercentage = (elapsed / totalTime) * 100;

      const hours = Math.floor(timeDiff / (1000 * 60 * 60));
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);
      
      let timeLeft: string;
      if (hours > 0) {
        timeLeft = `${hours}h ${minutes.toString().padStart(2, '0')}m`;
      } else {
        timeLeft = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      }

      setState({
        timeLeft,
        progressPercentage,
        status: 'countdown',
        nextUpdateTime,
        lastUpdateTime,
        itemsCount,
        pendingFirstUpdate
      });
    };

    calculateState();
    const interval = setInterval(calculateState, 1000);
    return () => clearInterval(interval);
  }, [preferences, trackedItems, isPaused]);

  if (!preferences || trackedItems.length === 0) {
    return null;
  }

  const getStatusColor = (status: UpdateStatus) => {
    switch (status) {
      case 'countdown': return 'text-primary';
      case 'updating': return 'text-blue-500';
      case 'waiting-first': return 'text-amber-500';
      case 'paused': return 'text-muted-foreground';
      case 'error': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusBadge = (status: UpdateStatus) => {
    switch (status) {
      case 'countdown': return <Badge variant="default" className="animate-pulse">Ativo</Badge>;
      case 'updating': return <Badge variant="secondary" className="bg-blue-100 text-blue-700">Atualizando</Badge>;
      case 'waiting-first': return <Badge variant="outline" className="border-amber-300 text-amber-700">Aguardando</Badge>;
      case 'paused': return <Badge variant="secondary">Pausado</Badge>;
      case 'error': return <Badge variant="error">Erro</Badge>;
      default: return null;
    }
  };

  const getIcon = (status: UpdateStatus) => {
    switch (status) {
      case 'countdown': return <Activity className="h-5 w-5 text-primary animate-pulse" />;
      case 'updating': return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'waiting-first': return <Clock className="h-5 w-5 text-amber-500" />;
      case 'paused': return <Pause className="h-5 w-5 text-muted-foreground" />;
      case 'error': return <Zap className="h-5 w-5 text-destructive" />;
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
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsPaused(!isPaused)}
                    className="hover:bg-primary/10"
                  >
                    {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isPaused ? 'Retomar monitoramento' : 'Pausar monitoramento'}
                </TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Info className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="max-w-sm">
                  <div className="space-y-2">
                    <p><strong>Frequência:</strong> A cada {preferences.update_frequency_minutes} minutos</p>
                    {state.lastUpdateTime && (
                      <p><strong>Última atualização:</strong> {formatRelativeTime(state.lastUpdateTime)}</p>
                    )}
                    {state.nextUpdateTime && (
                      <p><strong>Próxima atualização:</strong> {formatExactDateTime(state.nextUpdateTime)}</p>
                    )}
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
                
                {state.status === 'countdown' && (
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
                  Aguardando primeira execução do sistema de monitoramento.
                </p>
              </div>
            )}

            {state.status === 'paused' && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted border">
                <Pause className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Monitoramento pausado. Clique em play para retomar.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}