
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { SettingsCard } from './SettingsCard'
import { Moon, Sun, Monitor, Trash2, FileText } from 'lucide-react'

export function AdvancedSettings() {
  const [theme, setTheme] = useState('system')
  const [density, setDensity] = useState('normal')
  const [cacheEnabled, setCacheEnabled] = useState(true)
  const [debugMode, setDebugMode] = useState(false)

  const systemLogs = [
    { id: 1, type: 'info', message: 'Sistema iniciado com sucesso', timestamp: '14:30:25' },
    { id: 2, type: 'warning', message: 'Limite de requisições próximo', timestamp: '14:25:10' },
    { id: 3, type: 'error', message: 'Falha na conexão com estabelecimento', timestamp: '14:20:45' }
  ]

  const handleClearCache = () => {
    console.log('Limpando cache...')
  }

  const handleClearLogs = () => {
    console.log('Limpando logs...')
  }

  const getLogBadgeVariant = (type: string) => {
    switch (type) {
      case 'error': return 'destructive'
      case 'warning': return 'default'
      default: return 'secondary'
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
        <div className="space-y-4">
          <div>
            <Label htmlFor="theme">Tema</Label>
            <Select value={theme} onValueChange={setTheme}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tema" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">
                  <div className="flex items-center gap-2">
                    <Sun className="w-4 h-4" />
                    Claro
                  </div>
                </SelectItem>
                <SelectItem value="dark">
                  <div className="flex items-center gap-2">
                    <Moon className="w-4 h-4" />
                    Escuro
                  </div>
                </SelectItem>
                <SelectItem value="system">
                  <div className="flex items-center gap-2">
                    <Monitor className="w-4 h-4" />
                    Sistema
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="density">Densidade de Informações</Label>
            <Select value={density} onValueChange={setDensity}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a densidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="compact">Compacto</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="spacious">Espaçoso</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </SettingsCard>

      <SettingsCard
        title="Performance"
        description="Configurações que afetam a velocidade do sistema"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="cache-enabled">Cache Habilitado</Label>
            <Switch
              id="cache-enabled"
              checked={cacheEnabled}
              onCheckedChange={setCacheEnabled}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="debug-mode">Modo Debug</Label>
            <Switch
              id="debug-mode"
              checked={debugMode}
              onCheckedChange={setDebugMode}
            />
          </div>

          <Button onClick={handleClearCache} variant="outline">
            <Trash2 className="w-4 h-4 mr-2" />
            Limpar Cache
          </Button>
        </div>
      </SettingsCard>

      <SettingsCard
        title="Logs do Sistema"
        description="Visualize e gerencie os logs de atividade"
      >
        <div className="space-y-4">
          <div className="max-h-48 overflow-y-auto space-y-2">
            {systemLogs.map((log) => (
              <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Badge variant={getLogBadgeVariant(log.type)}>
                    {log.type}
                  </Badge>
                  <span className="text-sm">{log.message}</span>
                </div>
                <span className="text-xs text-muted-foreground">{log.timestamp}</span>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Button onClick={handleClearLogs} variant="outline">
              <Trash2 className="w-4 h-4 mr-2" />
              Limpar Logs
            </Button>
            <Button variant="outline">
              <FileText className="w-4 h-4 mr-2" />
              Exportar Logs
            </Button>
          </div>
        </div>
      </SettingsCard>

      <div className="flex justify-end gap-2">
        <Button variant="outline">Cancelar</Button>
        <Button>Salvar Alterações</Button>
      </div>
    </div>
  )
}
