
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { SettingsCard } from './SettingsCard'
import { Database, Download, Upload, RefreshCw } from 'lucide-react'

export function IntegrationSettings() {
  const [sefazConnected, setSefazConnected] = useState(true)
  const [autoBackup, setAutoBackup] = useState(true)
  const [apiKey, setApiKey] = useState('****-****-****-****')

  const handleTestConnection = () => {
    alert('Conectividade OK!')
  }

  const handleExportData = () => {
    console.log('Exportando dados...')
  }

  const handleImportData = () => {
    console.log('Importando dados...')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Configurações de Integração</h1>
        <p className="text-muted-foreground">Gerencie conexões com APIs e backup de dados</p>
      </div>

      <SettingsCard
        title="Integração SEFAZ"
        description="Configure a conexão com a API da SEFAZ para busca de preços"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              <span>Conexão SEFAZ</span>
              <Badge variant={sefazConnected ? "success" : "error"}>
                {sefazConnected ? 'Conectado' : 'Desconectado'}
              </Badge>
            </div>
            <Switch
              checked={sefazConnected}
              onCheckedChange={setSefazConnected}
            />
          </div>

          <div>
            <Label htmlFor="api-key">Token de API</Label>
            <Input
              id="api-key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Digite seu token de API"
            />
          </div>

          <Button onClick={handleTestConnection} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Testar Conexão
          </Button>
        </div>
      </SettingsCard>

      <SettingsCard
        title="Backup de Dados"
        description="Configure como seus dados são salvos e restaurados"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="auto-backup">Backup Automático</Label>
            <Switch
              id="auto-backup"
              checked={autoBackup}
              onCheckedChange={setAutoBackup}
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleExportData} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Exportar Dados
            </Button>
            <Button onClick={handleImportData} variant="outline">
              <Upload className="w-4 h-4 mr-2" />
              Importar Dados
            </Button>
          </div>

          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              Último backup: 23/07/2025 às 14:30
            </p>
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
