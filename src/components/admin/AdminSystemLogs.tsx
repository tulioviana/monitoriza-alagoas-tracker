import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Activity, RefreshCw, AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react'
import { useState } from 'react'

interface SyncLog {
  id: number
  executed_at: string
  execution_type: string
  status: string
  duration_ms: number | null
  error_message: string | null
  response_body: string | null
}

export function AdminSystemLogs() {
  const [refreshing, setRefreshing] = useState(false)

  const { data: logs, refetch, isLoading } = useQuery({
    queryKey: ['admin', 'system-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sync_execution_log')
        .select('*')
        .order('executed_at', { ascending: false })
        .limit(50)

      if (error) throw error
      return data as SyncLog[]
    },
    refetchInterval: 30000, // Auto refresh every 30 seconds
  })

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await refetch()
    } finally {
      setRefreshing(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />
      case 'running':
        return <Clock className="w-4 h-4 text-blue-500" />
      default:
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge variant="default" className="bg-green-500">Sucesso</Badge>
      case 'error':
        return <Badge variant="error">Erro</Badge>
      case 'running':
        return <Badge variant="secondary">Executando</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatDuration = (ms: number | null) => {
    if (!ms) return 'N/A'
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          <h3 className="text-lg font-medium">Logs do Sistema</h3>
        </div>
        <Button onClick={handleRefresh} disabled={refreshing} variant="outline" size="sm">
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      <div className="space-y-3">
        {logs && logs.length > 0 ? (
          logs.map((log) => (
            <Card key={log.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    {getStatusIcon(log.status)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium">
                          {log.execution_type === 'cron' ? 'Sincronização Automática' : 'Sincronização Manual'}
                        </p>
                        {getStatusBadge(log.status)}
                      </div>
                      
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>
                          <span className="font-medium">Executado em:</span> {' '}
                          {new Date(log.executed_at).toLocaleString('pt-BR')}
                        </p>
                        
                        {log.duration_ms && (
                          <p>
                            <span className="font-medium">Duração:</span> {formatDuration(log.duration_ms)}
                          </p>
                        )}
                        
                        {log.error_message && (
                          <p className="text-red-600">
                            <span className="font-medium">Erro:</span> {log.error_message}
                          </p>
                        )}
                      </div>
                      
                      {log.response_body && (
                        <details className="mt-2">
                          <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground">
                            Ver resposta completa
                          </summary>
                          <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-h-32">
                            {log.response_body}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="w-8 h-8 mx-auto mb-2" />
            <p>Nenhum log encontrado</p>
          </div>
        )}
      </div>

      {logs && logs.length >= 50 && (
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground">
            Mostrando os 50 logs mais recentes
          </p>
        </div>
      )}
    </div>
  )
}