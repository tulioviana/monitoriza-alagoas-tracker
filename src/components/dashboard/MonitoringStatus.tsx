
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/loading'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { 
  Monitor, 
  Clock, 
  CheckCircle,
  PauseCircle,
  Info
} from 'lucide-react'
import { useDashboardStats } from '@/hooks/useDashboardStats'

export function MonitoringStatus() {
  const { data: stats, isLoading } = useDashboardStats()

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
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
      title: 'Última Sincronização',
      value: getLastUpdateText(),
      icon: <Clock className="w-4 h-4" />,
      description: 'Dados atualizados do sistema',
      color: stats.lastUpdateTime ? 'text-blue-600' : 'text-gray-600',
      bgColor: stats.lastUpdateTime ? 'bg-blue-50' : 'bg-gray-50'
    }
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {cards.map((card, index) => (
        <Card key={index} className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              {card.title}
              {card.title === 'Última Sincronização' && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-3 w-3" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Hora da última coleta de dados do sistema</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
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
