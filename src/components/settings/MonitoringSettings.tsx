import { useState, useEffect } from 'react';
import { SettingsCard } from './SettingsCard';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useMonitoringPreferences } from '@/hooks/useMonitoringPreferences';
import { Skeleton } from '@/components/ui/skeleton';
import { useSettingsContext } from '@/contexts/SettingsContext';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';
import { toast } from 'sonner';

const FREQUENCY_OPTIONS = [
  { value: 5, label: 'A cada 5 minutos' },
  { value: 15, label: 'A cada 15 minutos' },
  { value: 30, label: 'A cada 30 minutos' },
  { value: 60, label: 'A cada hora' },
  { value: 180, label: 'A cada 3 horas' },
  { value: 360, label: 'A cada 6 horas' },
  { value: 720, label: 'A cada 12 horas' },
  { value: 1440, label: 'Uma vez por dia' },
];

export function MonitoringSettings() {
  const { 
    preferences, 
    isLoading, 
    updatePreferences, 
    isUpdatingPreferences 
  } = useMonitoringPreferences();
  
  const { hasUnsavedChanges, markAsChanged, resetChanges } = useSettingsContext();
  
  // Local state for form values
  const [localFrequency, setLocalFrequency] = useState<number>(30);
  const [localNotifications, setLocalNotifications] = useState<boolean>(true);
  const [localThreshold, setLocalThreshold] = useState<number>(5.0);
  const [localMaxItems, setLocalMaxItems] = useState<number>(50);
  
  // Initial values to track changes
  const [initialData, setInitialData] = useState({
    frequency: 30,
    notifications: true,
    threshold: 5.0,
    maxItems: 50
  });

  const { markAsChanged: markAsChangedLocal } = useUnsavedChanges();

  useEffect(() => {
    if (preferences) {
      const data = {
        frequency: preferences.update_frequency_minutes,
        notifications: preferences.enable_notifications,
        threshold: preferences.price_change_threshold || 5.0,
        maxItems: preferences.max_items_per_user
      };
      setInitialData(data);
      setLocalFrequency(data.frequency);
      setLocalNotifications(data.notifications);
      setLocalThreshold(data.threshold);
      setLocalMaxItems(data.maxItems);
    }
  }, [preferences]);

  // Check if there are changes
  useEffect(() => {
    const hasChanges = preferences && (
      localFrequency !== preferences.update_frequency_minutes ||
      localNotifications !== preferences.enable_notifications ||
      localThreshold !== (preferences.price_change_threshold || 5.0) ||
      localMaxItems !== preferences.max_items_per_user
    );
    
    if (hasChanges) {
      markAsChanged();
    }
  }, [localFrequency, localNotifications, localThreshold, localMaxItems, preferences, markAsChanged]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <SettingsCard title="Frequência de Atualização">
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
        update_frequency_minutes: localFrequency,
        enable_notifications: localNotifications,
        price_change_threshold: localThreshold,
        max_items_per_user: localMaxItems
      });
      
      setInitialData({
        frequency: localFrequency,
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
    setLocalFrequency(initialData.frequency);
    setLocalNotifications(initialData.notifications);
    setLocalThreshold(initialData.threshold);
    setLocalMaxItems(initialData.maxItems);
    resetChanges();
  };

  const handleFrequencyChange = (value: string) => {
    setLocalFrequency(parseInt(value));
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
        title="Frequência de Atualização"
        description="Defina com que frequência os preços dos seus itens monitorados serão atualizados."
      >
        <div className="space-y-2">
          <Label htmlFor="frequency">Frequência de Atualização</Label>
          <Select 
            value={localFrequency.toString()} 
            onValueChange={handleFrequencyChange}
            disabled={isUpdatingPreferences}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FREQUENCY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value.toString()}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            Frequências menores consomem mais recursos mas mantêm os preços mais atualizados.
          </p>
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