import { useState, useEffect } from 'react';
import { SettingsCard } from './SettingsCard';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useMonitoringPreferences } from '@/hooks/useMonitoringPreferences';
import { Skeleton } from '@/components/ui/skeleton';
import { useSettingsContext } from '@/contexts/SettingsContext';

import { Clock } from 'lucide-react';
import { toast } from 'sonner';

export function MonitoringSettings() {
  const { 
    preferences, 
    isLoading, 
    updatePreferences, 
    isUpdatingPreferences 
  } = useMonitoringPreferences();
  
  const { hasUnsavedChanges, markAsChanged, resetChanges } = useSettingsContext();
  
  // Local state for form values (removed frequency)
  const [localNotifications, setLocalNotifications] = useState<boolean>(true);
  const [localThreshold, setLocalThreshold] = useState<number>(5.0);
  const [localMaxItems, setLocalMaxItems] = useState<number>(50);
  
  // Initial values to track changes (removed frequency)
  const [initialData, setInitialData] = useState({
    notifications: true,
    threshold: 5.0,
    maxItems: 50
  });

  

  useEffect(() => {
    if (preferences) {
      const data = {
        notifications: preferences.enable_notifications,
        threshold: preferences.price_change_threshold || 5.0,
        maxItems: preferences.max_items_per_user
      };
      setInitialData(data);
      setLocalNotifications(data.notifications);
      setLocalThreshold(data.threshold);
      setLocalMaxItems(data.maxItems);
    }
  }, [preferences]);

  // Check if there are changes (removed frequency check)
  useEffect(() => {
    const hasChanges = preferences && (
      localNotifications !== preferences.enable_notifications ||
      localThreshold !== (preferences.price_change_threshold || 5.0) ||
      localMaxItems !== preferences.max_items_per_user
    );
    
    if (hasChanges) {
      markAsChanged();
    }
  }, [localNotifications, localThreshold, localMaxItems, preferences, markAsChanged]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <SettingsCard title="Atualizações Diárias">
          <Skeleton className="h-10 w-full" />
        </SettingsCard>
        <SettingsCard title="Configurações Avançadas">
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-10 w-full" />
          </div>
        </SettingsCard>
      </div>
    );
  }

  if (!preferences) {
    return (
      <SettingsCard title="Configurações de Monitoramento">
        <div className="text-center py-8 text-muted-foreground">
          Erro ao carregar configurações. Tente recarregar a página.
        </div>
      </SettingsCard>
    );
  }

  const handleSave = async () => {
    try {
      await updatePreferences({
        enable_notifications: localNotifications,
        price_change_threshold: localThreshold,
        max_items_per_user: localMaxItems
      });
      
      setInitialData({
        notifications: localNotifications,
        threshold: localThreshold,
        maxItems: localMaxItems
      });
      
      resetChanges();
      toast.success('Configurações de monitoramento salvas!');
    } catch (error) {
      toast.error('Erro ao salvar configurações');
    }
  };

  const handleCancel = () => {
    setLocalNotifications(initialData.notifications);
    setLocalThreshold(initialData.threshold);
    setLocalMaxItems(initialData.maxItems);
    resetChanges();
  };

  const handleNotificationsToggle = (enabled: boolean) => {
    setLocalNotifications(enabled);
  };

  const handleThresholdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value >= 0) {
      setLocalThreshold(value);
    }
  };

  const handleMaxItemsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value > 0 && value <= 200) {
      setLocalMaxItems(value);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Configurações de Monitoramento</h1>
        <p className="text-muted-foreground">Configure como os preços são monitorados e quando você será alertado</p>
      </div>

      <SettingsCard 
        title="Atualizações Diárias" 
        description="Todos os itens monitorados são atualizados uma vez por dia às 06:00 (horário UTC)"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 dark:bg-blue-950/20 dark:border-blue-900/50">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" />
              <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                Sistema de Atualização Centralizada
              </p>
            </div>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
              Para garantir estabilidade e eficiência, todos os preços são atualizados simultaneamente às 03:00 (horário de Brasília).
            </p>
          </div>
        </div>
      </SettingsCard>

      <SettingsCard 
        title="Notificações"
        description="Configure quando você quer ser notificado sobre mudanças de preços."
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="notifications">Ativar Notificações</Label>
              <p className="text-sm text-muted-foreground">
                Receba alertas quando os preços mudarem significativamente
              </p>
            </div>
            <Switch
              id="notifications"
              checked={localNotifications}
              onCheckedChange={handleNotificationsToggle}
              disabled={isUpdatingPreferences}
            />
          </div>

          {localNotifications && (
            <div className="space-y-2">
              <Label htmlFor="threshold">Limite de Variação (%)</Label>
              <Input
                id="threshold"
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={localThreshold}
                onChange={handleThresholdChange}
                disabled={isUpdatingPreferences}
              />
              <p className="text-sm text-muted-foreground">
                Você será notificado quando o preço variar mais que este percentual
              </p>
            </div>
          )}
        </div>
      </SettingsCard>

      <SettingsCard 
        title="Limites"
        description="Configure os limites da sua conta de monitoramento."
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="max-items">Máximo de Itens Monitorados</Label>
            <Input
              id="max-items"
              type="number"
              min="1"
              max="200"
              value={localMaxItems}
              onChange={handleMaxItemsChange}
              disabled={isUpdatingPreferences}
            />
            <p className="text-sm text-muted-foreground">
              Número máximo de itens que você pode monitorar simultaneamente
            </p>
          </div>
        </div>
      </SettingsCard>

      {hasUnsavedChanges && (
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleCancel}>Cancelar</Button>
          <Button onClick={handleSave} disabled={isUpdatingPreferences}>
            {isUpdatingPreferences ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </div>
      )}
    </div>
  );
}