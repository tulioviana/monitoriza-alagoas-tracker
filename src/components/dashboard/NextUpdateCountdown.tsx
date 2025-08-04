import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, RefreshCw } from 'lucide-react';
import { useMonitoringPreferences } from '@/hooks/useMonitoringPreferences';
import { useTrackedItems } from '@/hooks/useTrackedItems';

export function NextUpdateCountdown() {
  const { preferences } = useMonitoringPreferences();
  const { trackedItems } = useTrackedItems();
  const [timeLeft, setTimeLeft] = useState<string>('--:--');

  useEffect(() => {
    if (!preferences || trackedItems.length === 0) {
      setTimeLeft('--:--');
      return;
    }

    const updateFrequencyMs = preferences.update_frequency_minutes * 60 * 1000;
    
    const calculateTimeLeft = () => {
      // Encontrar o item com a atualização mais recente
      const mostRecentUpdate = trackedItems.reduce((latest, item) => {
        const itemTime = item.last_updated_at ? new Date(item.last_updated_at).getTime() : 0;
        return itemTime > latest ? itemTime : latest;
      }, 0);

      if (mostRecentUpdate === 0) {
        setTimeLeft('Aguardando...');
        return;
      }

      const nextUpdateTime = mostRecentUpdate + updateFrequencyMs;
      const now = Date.now();
      const timeDiff = nextUpdateTime - now;

      if (timeDiff <= 0) {
        setTimeLeft('Atualizando...');
        return;
      }

      const minutes = Math.floor(timeDiff / (1000 * 60));
      const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);
      
      setTimeLeft(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    };

    // Calcular imediatamente
    calculateTimeLeft();

    // Atualizar a cada segundo
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [preferences, trackedItems]);

  if (!preferences || trackedItems.length === 0) {
    return null;
  }

  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <Clock className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Próxima atualização</p>
              <p className="text-xs text-muted-foreground">
                Frequência: {preferences.update_frequency_minutes} min
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-2xl font-mono font-bold text-primary">
                {timeLeft}
              </p>
              <p className="text-xs text-muted-foreground">
                min:seg
              </p>
            </div>
            <RefreshCw className="h-5 w-5 text-muted-foreground animate-spin" style={{
              animationDuration: timeLeft === 'Atualizando...' ? '1s' : '10s'
            }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}