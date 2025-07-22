
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/loading'
import { 
  Monitor, 
  Activity, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  PauseCircle
} from 'lucide-react'
import { useDashboardStats } from '@/hooks/useDashboardStats'

export function MonitoringStatus() {
  const { data: stats, isLoading } = useDashboardStats()

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!stats) return null

  const getLastUpdateText = () => {
    if (!stats.lastUpdateTime) return 'Nenhuma atualização'
    
    const updateTime = new Date(stats.lastUpdateTime)
    const now = new Date()
    const diffMinutes = Math.floor((now.getTime() - updateTime.getTime()) / 60000)
    
    if (diffMinutes < 1) return 'Agora mesmo'
    if (diffMinutes < 60) return `${diffMinutes} min atrás`
    
    const diffHours = Math.floor(diffMinutes / 60)
    if (diffHours < 24) return `${diffHours}h atrás`
    
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}d atrás`
  }

  const cards = [
    {
      title: 'Itens Ativos',
      value: stats.activeItems,
      icon: <Monitor className="w-4 h-4" />,
      description: 'Monitoramento em execução',
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Itens Pausados',
      value: stats.pausedItems,
      icon: <PauseCircle className="w-4 h-4" />,
      description: 'Aguardando reativação',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50'
    },
    {
      title: 'Última Atualização',
      value: getLastUpdateText(),
      icon: <Clock className="w-4 h-4" />,
      description: 'Sincronização de dados',
      color: stats.lastUpdateTime ? 'text-blue-600' : 'text-gray-600',
      bgColor: stats.lastUpdateTime ? 'bg-blue-50' : 'bg-gray-50'
    },
    {
      title: 'Itens com Problemas',
      value: stats.itemsWithIssues,
      icon: <AlertTriangle className="w-4 h-4" />,
      description: 'Requerem atenção',
      color: stats.itemsWithIssues > 0 ? 'text-red-600' : 'text-green-600',
      bgColor: stats.itemsWithIssues > 0 ? 'bg-red-50' : 'bg-green-50'
    }
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, index) => (
        <Card key={index} className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <div className={`w-8 h-8 rounded-full ${card.bgColor} flex items-center justify-center`}>
              <div className={card.color}>
                {card.icon}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground mb-1">
              {card.value}
            </div>
            <p className="text-xs text-muted-foreground">
              {card.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
