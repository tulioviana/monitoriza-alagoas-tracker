import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { RefreshCw, Activity, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'

interface SyncLog {
  id: number
  executed_at: string
  execution_type: string
  status: string
  duration_ms: number | null
  error_message: string | null
}

interface CronJob {
  jobname: string
  schedule: string
  active: boolean
  last_run: string | null
}

export function SystemMonitoring() {
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([])
  const [cronJobs, setCronJobs] = useState<CronJob[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const { toast } = useToast()

  const loadMonitoringData = async () => {
    try {
      setRefreshing(true)

      // Carregar logs de sincronização
      const { data: logs, error: logsError } = await supabase
        .rpc('get_recent_sync_logs', { limit_count: 10 })

      if (logsError) throw logsError

      // Carregar informações do cron job
      const { data: cron, error: cronError } = await supabase
        .rpc('check_cron_jobs')

      if (cronError) throw cronError

      setSyncLogs(logs || [])
      setCronJobs(cron || [])
    } catch (error) {
      console.error('Erro ao carregar dados de monitoramento:', error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados de monitoramento",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const executeManualSync = async () => {
    try {
      setRefreshing(true)
      
      const { data, error } = await supabase
        .rpc('execute_sync_with_logging')

      if (error) throw error

      toast({
        title: "Sincronização Executada",
        description: data || "Sincronização manual executada com sucesso",
        variant: "default"
      })

      // Recarregar dados após execução
      setTimeout(loadMonitoringData, 2000)
    } catch (error) {
      console.error('Erro na sincronização manual:', error)
      toast({
        title: "Erro",
        description: "Falha na execução da sincronização manual",
        variant: "destructive"
      })
    } finally {
      setRefreshing(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return <Badge variant="secondary" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Sucesso</Badge>
      case 'ERROR':
        return <Badge variant="error"><XCircle className="w-3 h-3 mr-1" />Erro</Badge>
      case 'EXECUTION_ERROR':
        return <Badge variant="error"><AlertTriangle className="w-3 h-3 mr-1" />Erro de Execução</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatDuration = (duration: number | null) => {
    if (!duration) return 'N/A'
    if (duration < 1000) return `${duration}ms`
    return `${(duration / 1000).toFixed(1)}s`
  }

  const getSuccessRate = () => {
    if (syncLogs.length === 0) return 0
    const successCount = syncLogs.filter(log => log.status === 'SUCCESS').length
    return Math.round((successCount / syncLogs.length) * 100)
  }

  const getAverageDuration = () => {
    const validDurations = syncLogs.filter(log => log.duration_ms !== null).map(log => log.duration_ms!)
    if (validDurations.length === 0) return 0
    return Math.round(validDurations.reduce((sum, duration) => sum + duration, 0) / validDurations.length)
  }

  useEffect(() => {
    loadMonitoringData()
    // Auto-refresh a cada 30 segundos
    const interval = setInterval(loadMonitoringData, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-32 bg-muted animate-pulse rounded-lg" />
        <div className="h-64 bg-muted animate-pulse rounded-lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Monitoramento do Sistema</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadMonitoringData} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button onClick={executeManualSync} disabled={refreshing}>
            <Activity className="w-4 h-4 mr-2" />
            Executar Sincronização
          </Button>
        </div>
      </div>

      {/* Métricas principais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Status do Cron Job</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              {cronJobs.length > 0 && cronJobs[0].active ? (
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  <Activity className="w-3 h-3 mr-1" />Ativo
                </Badge>
              ) : (
                <Badge variant="error">
                  <XCircle className="w-3 h-3 mr-1" />Inativo
                </Badge>
              )}
            </div>
            {cronJobs.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Frequência: {cronJobs[0].schedule}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Sucesso</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getSuccessRate()}%</div>
            <p className="text-xs text-muted-foreground">Últimas {syncLogs.length} execuções</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(getAverageDuration())}</div>
            <p className="text-xs text-muted-foreground">Duração média</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Última Execução</CardTitle>
          </CardHeader>
          <CardContent>
            {syncLogs.length > 0 ? (
              <div>
                <div className="text-sm font-medium">
                  {new Date(syncLogs[0].executed_at).toLocaleString('pt-BR')}
                </div>
                <p className="text-xs text-muted-foreground">
                  {getStatusBadge(syncLogs[0].status)}
                </p>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">Nenhuma execução</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Histórico de execuções */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="w-5 h-5 mr-2" />
            Histórico de Execuções
          </CardTitle>
        </CardHeader>
        <CardContent>
          {syncLogs.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhuma execução registrada
            </p>
          ) : (
            <div className="space-y-2">
              {syncLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getStatusBadge(log.status)}
                    <div>
                      <div className="text-sm font-medium">
                        {new Date(log.executed_at).toLocaleString('pt-BR')}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Tipo: {log.execution_type} • Duração: {formatDuration(log.duration_ms)}
                      </div>
                    </div>
                  </div>
                  {log.error_message && (
                    <div className="text-xs text-red-600 max-w-md truncate">
                      {log.error_message}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}