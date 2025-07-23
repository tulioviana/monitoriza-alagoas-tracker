
import { useState, useCallback, useEffect } from 'react'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { SettingsCard } from './SettingsCard'
import { useSystemSettings } from '@/hooks/useSystemSettings'
import { toast } from 'sonner'

export function MonitoringSettings() {
  const { settings, loading, saving, saveSettings } = useSystemSettings()
  const [searchRadius, setSearchRadius] = useState([10])
  const [maxItems, setMaxItems] = useState([50])
  const [localSettings, setLocalSettings] = useState(settings)

  // Update local settings when external settings change
  useEffect(() => {
    setLocalSettings(settings)
  }, [settings])

  const handleAutoUpdateChange = useCallback(async (checked: boolean) => {
    const newSettings = {
      ...settings,
      auto_update_enabled: checked
    }
    
    // Update local state immediately for responsive UI
    setLocalSettings(newSettings)
    
    try {
      await saveSettings(newSettings)
    } catch (error) {
      // Rollback on error
      setLocalSettings(settings)
      toast.error('Erro ao alterar configuração de atualização automática')
    }
  }, [settings, saveSettings])

  const handleFrequencyChange = useCallback(async (frequency: string) => {
    const newSettings = {
      ...settings,
      update_frequency: frequency
    }
    
    // Update local state immediately for responsive UI
    setLocalSettings(newSettings)
    
    try {
      await saveSettings(newSettings)
    } catch (error) {
      // Rollback on error
      setLocalSettings(settings)
      toast.error('Erro ao alterar frequência de consulta')
    }
  }, [settings, saveSettings])

  if (loading) {
    return <div className="flex justify-center py-8">Carregando configurações...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Configurações de Monitoramento</h1>
        <p className="text-muted-foreground">Configure como o sistema monitora preços e produtos</p>
      </div>

      <SettingsCard
        title="Frequência de Atualização"
        description="Defina com que frequência o sistema deve buscar novos preços"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="auto-update">Atualização Automática</Label>
            <Switch
              id="auto-update"
              checked={localSettings.auto_update_enabled}
              onCheckedChange={handleAutoUpdateChange}
              disabled={saving}
            />
          </div>
          
          <div>
            <Label htmlFor="frequency">
              Frequência de Consulta {saving && '(salvando...)'}
            </Label>
            <Select 
              value={localSettings.update_frequency} 
              onValueChange={handleFrequencyChange}
              disabled={saving}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a frequência" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30m">A cada 30 minutos</SelectItem>
                <SelectItem value="1h">A cada 1 hora</SelectItem>
                <SelectItem value="6h">A cada 6 horas</SelectItem>
                <SelectItem value="12h">A cada 12 horas</SelectItem>
                <SelectItem value="24h">A cada 24 horas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </SettingsCard>

      <SettingsCard
        title="Configurações de Busca"
        description="Personalize como o sistema busca produtos e estabelecimentos"
      >
        <div className="space-y-6">
          <div>
            <Label>Raio de Busca: {searchRadius[0]} km</Label>
            <div className="mt-2">
              <Slider
                value={searchRadius}
                onValueChange={setSearchRadius}
                max={50}
                min={1}
                step={1}
                className="w-full"
              />
            </div>
          </div>

          <div>
            <Label>Máximo de Itens Monitorados: {maxItems[0]}</Label>
            <div className="mt-2">
              <Slider
                value={maxItems}
                onValueChange={setMaxItems}
                max={100}
                min={10}
                step={10}
                className="w-full"
              />
            </div>
          </div>
        </div>
      </SettingsCard>
    </div>
  )
}
