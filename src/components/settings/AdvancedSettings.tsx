
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { SettingsCard } from './SettingsCard'
import { Badge } from '@/components/ui/badge'
import { Clock, Trash2, Download, RotateCcw, Sun, Moon, Monitor } from 'lucide-react'
import { useSystemLogs } from '@/hooks/useSystemLogs'
import { useTheme } from '@/hooks/useTheme'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'
import { useSettingsContext } from '@/contexts/SettingsContext'
import { toast } from 'sonner'

export function AdvancedSettings() {
  const { theme, setTheme: setAppTheme, density, setDensity: setAppDensity } = useTheme()
  const { hasUnsavedChanges, resetChanges } = useSettingsContext()
  const { logs, loading, error, refetch, clearLogs, exportLogs } = useSystemLogs()
  
  const [localTheme, setLocalTheme] = useState(theme)
  const [localDensity, setLocalDensity] = useState(density)
  const [initialData, setInitialData] = useState({ theme, density })

  useUnsavedChanges({ theme: localTheme, density: localDensity }, initialData)

  useEffect(() => {
    setInitialData({ theme, density })
    setLocalTheme(theme)
    setLocalDensity(density)
  }, [theme, density])

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      day: '2-digit',
      month: '2-digit'
    })
  }

  const getLogBadgeVariant = (type: string) => {
    switch (type) {
      case 'error': return 'error'
      case 'warning': return 'warning'
      default: return 'secondary'
    }
  }

  const handleSave = () => {
    setAppTheme(localTheme)
    setAppDensity(localDensity)
    setInitialData({ theme: localTheme, density: localDensity })
    resetChanges()
    toast.success('Configurações de aparência salvas!')
  }

  const handleCancel = () => {
    setLocalTheme(initialData.theme)
    setLocalDensity(initialData.density)
    resetChanges()
  }

  const handleClearLogs = () => {
    clearLogs()
  }

  const handleExportLogs = () => {
    exportLogs()
  }

  const getThemeIcon = (themeValue: string) => {
    switch (themeValue) {
      case 'light':
        return <Sun className="w-4 h-4 mr-2" />
      case 'dark':
        return <Moon className="w-4 h-4 mr-2" />
      default:
        return <Monitor className="w-4 h-4 mr-2" />
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Configurações Avançadas</h1>
        <p className="text-muted-foreground">Configurações técnicas e de sistema</p>
      </div>

      <SettingsCard
        title="Aparência"
        description="Personalize a interface do sistema"
      >
        <div className="space-y-6">
          <div>
            <Label className="text-sm font-medium">Tema</Label>
            <RadioGroup value={localTheme} onValueChange={(value) => setLocalTheme(value as any)} className="mt-2">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="light" id="light" />
                <Label htmlFor="light" className="flex items-center">
                  {getThemeIcon('light')}
                  Claro
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="dark" id="dark" />
                <Label htmlFor="dark" className="flex items-center">
                  {getThemeIcon('dark')}
                  Escuro
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="system" id="system" />
                <Label htmlFor="system" className="flex items-center">
                  {getThemeIcon('system')}
                  Sistema
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div>
            <Label className="text-sm font-medium">Densidade de informações</Label>
            <RadioGroup value={localDensity} onValueChange={(value) => setLocalDensity(value as any)} className="mt-2">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="compact" id="compact" />
                <Label htmlFor="compact">Compacto - Mais informações em menos espaço</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="normal" id="normal" />
                <Label htmlFor="normal">Normal - Balanceamento ideal</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="spacious" id="spacious" />
                <Label htmlFor="spacious">Espaçoso - Mais conforto visual</Label>
              </div>
            </RadioGroup>
          </div>
        </div>
      </SettingsCard>

      <SettingsCard
        title="Logs do Sistema"
        description="Visualize e gerencie os logs de atividade"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Atividade Recente</h3>
            <Button onClick={refetch} variant="outline" size="sm" disabled={loading}>
              <RotateCcw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>

          {error && (
            <div className="p-3 bg-red-100 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="max-h-48 overflow-y-auto space-y-2">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RotateCcw className="w-5 h-5 animate-spin mr-2" />
                <span>Carregando logs...</span>
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum log encontrado
              </div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant={getLogBadgeVariant(log.type)}>
                      {log.type}
                    </Badge>
                    <span className="text-sm">{log.message}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatTimestamp(log.timestamp)}
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="flex gap-2">
            <Button onClick={handleClearLogs} variant="outline">
              <Trash2 className="w-4 h-4 mr-2" />
              Limpar Logs
            </Button>
            <Button onClick={handleExportLogs} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Exportar Logs
            </Button>
          </div>
        </div>
      </SettingsCard>

      {hasUnsavedChanges && (
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleCancel}>Cancelar</Button>
          <Button onClick={handleSave}>Salvar Alterações</Button>
        </div>
      )}
    </div>
  )
}
