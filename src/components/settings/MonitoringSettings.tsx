import { SettingsCard } from './SettingsCard';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useMonitoringPreferences } from '@/hooks/useMonitoringPreferences';
import { Skeleton } from '@/components/ui/skeleton';

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

  const handleFrequencyChange = (value: string) => {
    updatePreferences({ update_frequency_minutes: parseInt(value) });
  };

  const handleNotificationsToggle = (enabled: boolean) => {
    updatePreferences({ enable_notifications: enabled });
  };

  const handleThresholdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value >= 0) {
      updatePreferences({ price_change_threshold: value });
    }
  };

  const handleMaxItemsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value > 0 && value <= 200) {
      updatePreferences({ max_items_per_user: value });
    }
  };

  return (
    <div className="space-y-6">
      <SettingsCard 
        title="Frequência de Atualização"
        description="Defina com que frequência os preços dos seus itens monitorados serão atualizados."
      >
        <div className="space-y-2">
          <Label htmlFor="frequency">Frequência de Atualização</Label>
          <Select 
            value={preferences.update_frequency_minutes.toString()} 
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
              checked={preferences.enable_notifications}
              onCheckedChange={handleNotificationsToggle}
              disabled={isUpdatingPreferences}
            />
          </div>

          {preferences.enable_notifications && (
            <div className="space-y-2">
              <Label htmlFor="threshold">Limite de Variação (%)</Label>
              <Input
                id="threshold"
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={preferences.price_change_threshold}
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
              value={preferences.max_items_per_user}
              onChange={handleMaxItemsChange}
              disabled={isUpdatingPreferences}
            />
            <p className="text-sm text-muted-foreground">
              Número máximo de itens que você pode monitorar simultaneamente
            </p>
          </div>
        </div>
      </SettingsCard>

      {isUpdatingPreferences && (
        <div className="flex items-center justify-center py-4">
          <div className="text-sm text-muted-foreground">
            Salvando configurações...
          </div>
        </div>
      )}
    </div>
  );
}