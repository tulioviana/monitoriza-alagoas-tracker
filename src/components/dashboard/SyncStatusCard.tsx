import { RefreshCw, Play, AlertCircle, CheckCircle, Clock, Pause, Wrench } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useSyncMonitoring } from '@/hooks/useSyncMonitoring'

const statusConfig = {
  active: {
    icon: CheckCircle,
    label: 'Ativo',
    variant: 'default' as const,
    color: 'text-green-500'
  },
  disabled: {
    icon: Pause,
    label: 'Desabilitado',
    variant: 'secondary' as const,
    color: 'text-gray-500'
  },
  paused: {
    icon: Pause,
    label: 'Pausado',
    variant: 'secondary' as const,
    color: 'text-yellow-500'
  },
  error: {
    icon: AlertCircle,
    label: 'Erro',
    variant: 'secondary' as const,
    color: 'text-red-500'
  },
  pending: {
    icon: Clock,
    label: 'Aguardando',
    variant: 'outline' as const,
    color: 'text-blue-500'
  },
  unknown: {
    icon: AlertCircle,
    label: 'Desconhecido',
    variant: 'outline' as const,
    color: 'text-gray-500'
  }
}

export function SyncStatusCard() {
  const { syncStatus, nextRun, syncLogs, syncNow, isSyncing, isLoading, repairSync, isRepairing } = useSyncMonitoring()

  const config = statusConfig[syncStatus]
  const StatusIcon = config.icon

  const lastSync = syncLogs[0]
  const lastSyncTime = lastSync ? new Date(lastSync.executed_at).toLocaleString() : 'Nunca'

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Status da Sincronização
        </CardTitle>
        <CardDescription>
          Monitoramento automático de preços
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Atual */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StatusIcon className={`h-4 w-4 ${config.color}`} />
            <span className="font-medium">Status:</span>
          </div>
          <Badge variant={config.variant}>{config.label}</Badge>
        </div>

        {/* Última Sincronização */}
        <div className="flex items-center justify-between">
          <span className="font-medium">Última execução:</span>
          <span className="text-sm text-muted-foreground">{lastSyncTime}</span>
        </div>

        {/* Próxima Execução */}
        {nextRun && (
          <div className="flex items-center justify-between">
            <span className="font-medium">Próxima execução:</span>
            <span className="text-sm text-muted-foreground">{nextRun}</span>
          </div>
        )}

        {/* Último Status */}
        {lastSync && (
          <div className="flex items-center justify-between">
            <span className="font-medium">Último resultado:</span>
            <Badge variant={lastSync.status === 'SUCCESS' ? 'default' : 'secondary'}>
              {lastSync.status === 'SUCCESS' ? 'Sucesso' : 'Erro'}
            </Badge>
          </div>
        )}

        {/* Botões de Ação */}
        <div className="pt-2 space-y-2">
          <Button 
            onClick={() => syncNow()}
            disabled={isSyncing || isLoading}
            className="w-full"
            variant="outline"
          >
            <Play className="h-4 w-4 mr-2" />
            {isSyncing ? 'Sincronizando...' : 'Sincronizar Agora'}
          </Button>
          
          {(syncStatus === 'error' || syncStatus === 'disabled' || syncStatus === 'unknown') && (
            <Button 
              onClick={() => repairSync()}
              disabled={isRepairing || isLoading}
              className="w-full"
              variant="secondary"
            >
              <Wrench className="h-4 w-4 mr-2" />
              {isRepairing ? 'Reparando...' : 'Reparar Sincronização'}
            </Button>
          )}
        </div>

        {/* Logs Recentes */}
        {syncLogs.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Execuções Recentes:</h4>
            <div className="space-y-1 max-h-24 overflow-y-auto">
              {syncLogs.slice(0, 3).map((log) => (
                <div key={log.id} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {new Date(log.executed_at).toLocaleString()}
                  </span>
                  <Badge 
                    variant={log.status === 'SUCCESS' ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {log.status === 'SUCCESS' ? 'OK' : 'Erro'}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}