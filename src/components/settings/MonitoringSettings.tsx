
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { SettingsCard } from './SettingsCard'
import { useSystemSettings } from '@/hooks/useSystemSettings'
import { useSettingsContext } from '@/contexts/SettingsContext'

export function MonitoringSettings() {
  const { settings, loading, saving, saveSettings } = useSystemSettings()
  const { markAsChanged, resetChanges } = useSettingsContext()
  
  const [updateFrequency, setUpdateFrequency] = useState('5m')
  const [autoUpdate, setAutoUpdate] = useState(true)
  const [hasChanges, setHasChanges] = useState(false)

  // Sincronizar estado local com configurações carregadas
  useEffect(() => {
    if (!loading && settings) {
      setUpdateFrequency(settings.update_frequency)
      setAutoUpdate(settings.auto_update_enabled)
      setHasChanges(false)
    }
  }, [loading, settings])

  // Detectar mudanças não salvas
  useEffect(() => {
    if (!loading && settings) {
      const changed = 
        updateFrequency !== settings.update_frequency ||
        autoUpdate !== settings.auto_update_enabled
      
      setHasChanges(changed)
      if (changed) {
        markAsChanged()
      }
    }
  }, [updateFrequency, autoUpdate, settings, loading, markAsChanged])

  const handleSave = async () => {
    if (!settings) return
    
    const success = await saveSettings({
      auto_update_enabled: autoUpdate,
      update_frequency: updateFrequency,
      search_radius: settings.search_radius,
      max_items: settings.max_items
    })
    
    if (success) {
      setHasChanges(false)
      resetChanges()
      
      // Force trigger of the cron job update for immediate effect
      console.log('Monitoring settings saved, cron job should be updated automatically')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Configurações de Monitoramento</h1>
        <p className="text-muted-foreground">Configure como o sistema monitora preços e produtos</p>
      </div>

      <SettingsCard
        title="Frequência de Atualização"
        description="Defina com que frequência o sistema deve buscar novos preços automaticamente"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="auto-update">Atualização Automática</Label>
              <p className="text-sm text-muted-foreground">
                Habilita a verificação automática de preços
              </p>
            </div>
            <Switch
              id="auto-update"
              checked={autoUpdate}
              onCheckedChange={setAutoUpdate}
            />
          </div>
          
          <div>
            <Label htmlFor="frequency">Frequência de Consulta</Label>
            <Select value={updateFrequency} onValueChange={setUpdateFrequency} disabled={!autoUpdate}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a frequência" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5m">A cada 5 minutos (recomendado para monitoramento intensivo)</SelectItem>
                <SelectItem value="30m">A cada 30 minutos (padrão)</SelectItem>
                <SelectItem value="1h">A cada 1 hora</SelectItem>
                <SelectItem value="6h">A cada 6 horas</SelectItem>
                <SelectItem value="12h">A cada 12 horas</SelectItem>
                <SelectItem value="24h">A cada 24 horas</SelectItem>
              </SelectContent>
            </Select>
            
            {autoUpdate && (
              <div className="mt-2 p-3 bg-muted rounded-md">
                <p className="text-sm text-muted-foreground">
                  <strong>Próxima verificação:</strong> Os preços serão verificados {updateFrequency === '5m' ? 'a cada 5 minutos' : 
                  updateFrequency === '30m' ? 'a cada 30 minutos' :
                  updateFrequency === '1h' ? 'a cada hora' :
                  updateFrequency === '6h' ? 'a cada 6 horas' :
                  updateFrequency === '12h' ? 'a cada 12 horas' : 
                  'diariamente'} apenas para itens que precisam de atualização baseado na frequência configurada.
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>Otimização:</strong> Itens recém-atualizados são automaticamente ignorados até que o tempo da frequência seja atingido.
                </p>
              </div>
            )}
          </div>
        </div>
      </SettingsCard>


      <div className="flex justify-end gap-2">
        <Button 
          variant="outline" 
          disabled={saving}
          onClick={() => {
            if (!loading && settings) {
              setUpdateFrequency(settings.update_frequency)
              setAutoUpdate(settings.auto_update_enabled)
              setHasChanges(false)
              resetChanges()
            }
          }}
        >
          Cancelar
        </Button>
        <Button 
          onClick={handleSave} 
          disabled={saving || loading || !hasChanges}
        >
          {saving ? 'Salvando...' : 'Salvar Alterações'}
        </Button>
      </div>
    </div>
  )
}
