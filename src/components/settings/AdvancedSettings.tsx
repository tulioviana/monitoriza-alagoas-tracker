
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { SettingsCard } from './SettingsCard'
import { useSystemLogs } from '@/hooks/useSystemLogs'
import { Moon, Sun, Monitor, Trash2, FileText, RefreshCw } from 'lucide-react'

export function AdvancedSettings() {
  const [theme, setTheme] = useState('system')
  const [density, setDensity] = useState('normal')
  const { logs, loading, error, refetch, clearLogs, exportLogs } = useSystemLogs()

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

  const handleClearLogs = () => {
    clearLogs()
    console.log('Logs limpos com sucesso')
  }

  const handleExportLogs = () => {
    exportLogs()
    console.log('Logs exportados com sucesso')
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
        title="Logs do Sistema"
        description="Visualize e gerencie os logs de atividade"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Atividade Recente</h3>
            <Button onClick={refetch} variant="outline" size="sm" disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
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
                <RefreshCw className="w-5 h-5 animate-spin mr-2" />
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
