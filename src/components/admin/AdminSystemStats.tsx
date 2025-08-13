import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart3, Users, Database, Activity, TrendingUp, TrendingDown, Calendar, Clock } from 'lucide-react'

export function AdminSystemStats() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin', 'system-overview'],
    queryFn: async () => {
      // Get basic counts
      const [
        { count: totalUsers },
        { count: totalTrackedItems },
        { count: totalPriceHistory },
        { count: totalSearchHistory }
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('tracked_items').select('*', { count: 'exact', head: true }),
        supabase.from('price_history').select('*', { count: 'exact', head: true }),
        supabase.from('search_history').select('*', { count: 'exact', head: true })
      ])

      // Get active items today
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      const { count: activeItemsToday } = await supabase
        .from('tracked_items')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .gte('last_updated_at', today.toISOString())

      // Get new users this week
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      
      const { count: newUsersThisWeek } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', weekAgo.toISOString())

      // Get price updates today
      const { count: priceUpdatesToday } = await supabase
        .from('price_history')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString())

      // Get recent sync stats
      const { data: recentSyncs } = await supabase
        .from('system_execution_logs')
        .select('status, started_at')
        .order('started_at', { ascending: false })
        .limit(10)

      const successfulSyncs = recentSyncs?.filter(sync => sync.status === 'success').length || 0
      const failedSyncs = recentSyncs?.filter(sync => sync.status === 'error').length || 0
      const successRate = recentSyncs?.length ? Math.round((successfulSyncs / recentSyncs.length) * 100) : 0

      return {
        totalUsers: totalUsers || 0,
        totalTrackedItems: totalTrackedItems || 0,
        totalPriceHistory: totalPriceHistory || 0,
        totalSearchHistory: totalSearchHistory || 0,
        activeItemsToday: activeItemsToday || 0,
        newUsersThisWeek: newUsersThisWeek || 0,
        priceUpdatesToday: priceUpdatesToday || 0,
        successRate,
        recentSyncs: recentSyncs || []
      }
    },
    refetchInterval: 60000, // Refresh every minute
  })

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-32 bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  const statCards = [
    {
      title: 'Total de Usuários',
      value: stats?.totalUsers || 0,
      icon: Users,
      color: 'text-blue-500',
      change: `+${stats?.newUsersThisWeek || 0} esta semana`
    },
    {
      title: 'Itens Monitorados',
      value: stats?.totalTrackedItems || 0,
      icon: Database,
      color: 'text-green-500',
      change: `${stats?.activeItemsToday || 0} atualizados hoje`
    },
    {
      title: 'Histórico de Preços',
      value: stats?.totalPriceHistory || 0,
      icon: TrendingUp,
      color: 'text-purple-500',
      change: `+${stats?.priceUpdatesToday || 0} hoje`
    },
    {
      title: 'Buscas Realizadas',
      value: stats?.totalSearchHistory || 0,
      icon: BarChart3,
      color: 'text-orange-500',
      change: 'Total acumulado'
    },
    {
      title: 'Taxa de Sucesso',
      value: `${stats?.successRate || 0}%`,
      icon: Activity,
      color: stats?.successRate && stats.successRate > 80 ? 'text-green-500' : 'text-red-500',
      change: 'Últimas 10 sincronizações'
    },
    {
      title: 'Última Sincronização',
      value: stats?.recentSyncs?.[0] ? 'Recente' : 'Nunca',
      icon: Clock,
      color: 'text-gray-500',
      change: stats?.recentSyncs?.[0] ? new Date(stats.recentSyncs[0].started_at).toLocaleString('pt-BR') : 'N/A'
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <BarChart3 className="w-5 h-5" />
        <h3 className="text-lg font-medium">Visão Geral do Sistema</h3>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat, index) => {
          const Icon = stat.icon
          return (
            <Card key={index}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </p>
                    <p className="text-2xl font-bold">
                      {stat.value}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {stat.change}
                    </p>
                  </div>
                  <Icon className={`w-8 h-8 ${stat.color}`} />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Quick Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Status do Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center p-4 rounded-lg bg-green-50 dark:bg-green-950">
              <div className="text-2xl font-bold text-green-600">
                {stats?.successRate || 0}%
              </div>
              <div className="text-sm text-green-700 dark:text-green-300">
                Taxa de Sucesso
              </div>
            </div>
            
            <div className="text-center p-4 rounded-lg bg-blue-50 dark:bg-blue-950">
              <div className="text-2xl font-bold text-blue-600">
                {stats?.activeItemsToday || 0}
              </div>
              <div className="text-sm text-blue-700 dark:text-blue-300">
                Itens Atualizados Hoje
              </div>
            </div>
            
            <div className="text-center p-4 rounded-lg bg-purple-50 dark:bg-purple-950">
              <div className="text-2xl font-bold text-purple-600">
                {stats?.newUsersThisWeek || 0}
              </div>
              <div className="text-sm text-purple-700 dark:text-purple-300">
                Novos Usuários (7 dias)
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}