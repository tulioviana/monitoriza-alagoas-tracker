import { NextUpdateCountdown } from '../dashboard/NextUpdateCountdown'
import { QuickCreditManager } from './QuickCreditManager'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Settings, Database, RefreshCw, Activity, AlertTriangle } from 'lucide-react'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { Badge } from '@/components/ui/badge'

export function AdminControlCenter() {
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Query for recent sync executions
  const { data: recentSyncs, refetch: refetchSyncs } = useQuery({
    queryKey: ['admin', 'recent-syncs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sync_execution_log')
        .select('*')
        .order('executed_at', { ascending: false })
        .limit(5)

      if (error) throw error
      return data
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  })

  // Query for system statistics
  const { data: systemStats } = useQuery({
    queryKey: ['admin', 'system-stats'],
    queryFn: async () => {
      const [trackedItems, priceHistory, users] = await Promise.all([
        supabase.from('tracked_items').select('id', { count: 'exact', head: true }),
        supabase.from('price_history').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true })
      ])

      return {
        trackedItems: trackedItems.count || 0,
        priceHistory: priceHistory.count || 0,
        users: users.count || 0
      }
    },
    refetchInterval: 60000, // Refresh every minute
  })

  const handleManualRefresh = async () => {
    setIsRefreshing(true)
    try {
      await refetchSyncs()
      // You could also trigger a manual sync here if needed
    } finally {
      setIsRefreshing(false)
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

  return (
    <div className="space-y-6">
      {/* Control Panel */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Database className="w-4 h-4 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Itens Monitorados</p>
                <p className="text-2xl font-bold">{systemStats?.trackedItems || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-green-500" />
              <div>
                <p className="text-sm font-medium">Histórico de Preços</p>
                <p className="text-2xl font-bold">{systemStats?.priceHistory || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Settings className="w-4 h-4 text-purple-500" />
              <div>
                <p className="text-sm font-medium">Usuários Ativos</p>
                <p className="text-2xl font-bold">{systemStats?.users || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <Button 
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="w-full"
              variant="outline"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Atualizar Dados
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Quick Credit Management */}
      <QuickCreditManager />

      {/* Sync Control */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Centro de Sincronização
          </CardTitle>
        </CardHeader>
        <CardContent>
          <NextUpdateCountdown />
        </CardContent>
      </Card>

      {/* Recent Sync Executions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Execuções Recentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentSyncs && recentSyncs.length > 0 ? (
              recentSyncs.map((sync) => (
                <div key={sync.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center space-x-3">
                    <div>
                      <p className="text-sm font-medium">
                        {sync.execution_type === 'cron' ? 'Sincronização Automática' : 'Sincronização Manual'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(sync.executed_at).toLocaleString('pt-BR')}
                      </p>
                      {sync.duration_ms && (
                        <p className="text-xs text-muted-foreground">
                          Duração: {sync.duration_ms}ms
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(sync.status)}
                    {sync.error_message && (
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <Activity className="w-8 h-8 mx-auto mb-2" />
                <p>Nenhuma execução recente encontrada</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}