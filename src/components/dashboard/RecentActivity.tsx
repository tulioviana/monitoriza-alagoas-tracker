import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  Bell, 
  Search,
  Monitor
} from 'lucide-react'

interface ActivityItem {
  id: string
  type: 'price_change' | 'search' | 'alert' | 'tracking'
  title: string
  description: string
  timestamp: string
  metadata?: {
    oldPrice?: number
    newPrice?: number
    change?: number
    location?: string
  }
}

export function RecentActivity() {
  const activities: ActivityItem[] = [
    {
      id: '1',
      type: 'price_change',
      title: 'Gasolina Comum - Redução de preço',
      description: 'Posto Shell Centro',
      timestamp: '2 min atrás',
      metadata: {
        oldPrice: 5.89,
        newPrice: 5.79,
        change: -1.7,
        location: 'Centro - Maceió'
      }
    },
    {
      id: '2',
      type: 'alert',
      title: 'Meta de preço atingida',
      description: 'Diesel S-10 atingiu R$ 5,20',
      timestamp: '15 min atrás',
      metadata: {
        newPrice: 5.20,
        location: 'Posto BR Farol'
      }
    },
    {
      id: '3',
      type: 'tracking',
      title: 'Novo item monitorado',
      description: 'Etanol adicionado ao monitoramento',
      timestamp: '1 hora atrás',
      metadata: {
        location: '3 postos selecionados'
      }
    },
    {
      id: '4',
      type: 'search',
      title: 'Busca realizada',
      description: 'Pesquisa por "Óleo Lubrificante"',
      timestamp: '2 horas atrás'
    },
    {
      id: '5',
      type: 'price_change',
      title: 'Gasolina Aditivada - Aumento',
      description: 'Posto Ipiranga Pajuçara',
      timestamp: '3 horas atrás',
      metadata: {
        oldPrice: 6.15,
        newPrice: 6.25,
        change: 1.6,
        location: 'Pajuçara - Maceió'
      }
    }
  ]

  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'price_change':
        return <TrendingUp className="w-4 h-4" />
      case 'alert':
        return <Bell className="w-4 h-4" />
      case 'tracking':
        return <Monitor className="w-4 h-4" />
      case 'search':
        return <Search className="w-4 h-4" />
      default:
        return <Clock className="w-4 h-4" />
    }
  }

  const getActivityColor = (type: ActivityItem['type']) => {
    switch (type) {
      case 'price_change':
        return 'bg-blue-500'
      case 'alert':
        return 'bg-orange-500'
      case 'tracking':
        return 'bg-green-500'
      case 'search':
        return 'bg-purple-500'
      default:
        return 'bg-gray-500'
    }
  }

  const formatPriceChange = (metadata: ActivityItem['metadata']) => {
    if (!metadata || typeof metadata.change !== 'number') return null
    
    const isPositive = metadata.change > 0
    const Icon = isPositive ? TrendingUp : TrendingDown
    const colorClass = isPositive ? 'text-destructive' : 'text-success'
    
    return (
      <div className={`flex items-center gap-1 ${colorClass}`}>
        <Icon className="w-3 h-3" />
        <span className="text-xs font-medium">
          {isPositive ? '+' : ''}{metadata.change.toFixed(1)}%
        </span>
      </div>
    )
  }

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Atividade Recente
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
            <Avatar className="w-8 h-8">
              <AvatarFallback className={`${getActivityColor(activity.type)} text-white text-xs`}>
                {getActivityIcon(activity.type)}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-foreground">
                    {activity.title}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    {activity.description}
                  </p>
                  {activity.metadata?.location && (
                    <p className="text-xs text-muted-foreground">
                      📍 {activity.metadata.location}
                    </p>
                  )}
                </div>
                
                <div className="flex flex-col items-end gap-1">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {activity.timestamp}
                  </span>
                  {formatPriceChange(activity.metadata)}
                </div>
              </div>
              
              {activity.metadata && (activity.metadata.oldPrice && activity.metadata.newPrice) && (
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="text-xs">
                    R$ {activity.metadata.oldPrice.toFixed(2)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">→</span>
                  <Badge variant="secondary" className="text-xs">
                    R$ {activity.metadata.newPrice.toFixed(2)}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        ))}
        
        <div className="pt-2 border-t">
          <button className="text-sm text-primary hover:underline w-full text-center">
            Ver todas as atividades
          </button>
        </div>
      </CardContent>
    </Card>
  )
}