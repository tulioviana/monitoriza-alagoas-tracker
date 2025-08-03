import { Button } from '@/components/ui/button'
import { RefreshCw, CheckCircle, AlertCircle, Clock, Settings } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useSyncStatus } from '@/hooks/useSyncStatus'
import { useSyncDiagnostics } from '@/hooks/useSyncDiagnostics'
import { Progress } from '@/components/ui/progress'

export function ForceUserSyncButton() {
  const { syncStatus, isPolling, startSync } = useSyncStatus()
  const { runDiagnostics, isRunning: isDiagnosing } = useSyncDiagnostics()
  const queryClient = useQueryClient()

  const handleForceSync = async () => {
    await startSync()
    
    // Invalidar queries para atualizar a interface quando completar
    setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ['tracked-items'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      queryClient.invalidateQueries({ queryKey: ['recent-activity'] })
    }, 1000)
  }

  const getStatusIcon = () => {
    switch (syncStatus.status) {
      case 'running':
        return <RefreshCw className="h-4 w-4 animate-spin" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <RefreshCw className="h-4 w-4" />
    }
  }

  const getButtonText = () => {
    switch (syncStatus.status) {
      case 'running':
        return `Sincronizando... ${syncStatus.progress}/${syncStatus.total_items}`
      case 'completed':
        return 'Sincronização Concluída'
      case 'error':
        return 'Erro na Sincronização'
      default:
        return 'Atualizar Preços'
    }
  }

  const isDisabled = syncStatus.status === 'running' || isPolling || isDiagnosing

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Button 
          onClick={handleForceSync} 
          disabled={isDisabled}
          variant="outline"
          className="gap-2 relative flex-1"
        >
          {getStatusIcon()}
          {getButtonText()}
        </Button>
        
        <Button
          onClick={runDiagnostics}
          disabled={isDisabled}
          variant="ghost"
          size="icon"
          title="Diagnosticar Sistema"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>
      
      {syncStatus.status === 'running' && syncStatus.total_items > 0 && (
        <div className="space-y-1">
          <Progress 
            value={(syncStatus.progress / syncStatus.total_items) * 100} 
            className="h-2"
          />
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {syncStatus.current_item && (
              <span className="truncate max-w-[200px]">{syncStatus.current_item}</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}