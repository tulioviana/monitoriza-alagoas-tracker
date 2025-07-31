
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { 
  Clock, 
  TrendingUp, 
  Plus,
  AlertTriangle,
  Activity
} from 'lucide-react'
import { useRecentActivity } from '@/hooks/useRecentActivity'

interface NewRecentActivityProps {
  onViewHistory?: () => void
}

export function NewRecentActivity({ onViewHistory }: NewRecentActivityProps) {
  const { data: activities, isLoading } = useRecentActivity(2)

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'price_update':
        return <TrendingUp className="w-4 h-4" />
      case 'item_added':
        return <Plus className="w-4 h-4" />
      case 'item_paused':
      case 'item_resumed':
        return <Activity className="w-4 h-4" />
      case 'issue_detected':
        return <AlertTriangle className="w-4 h-4" />
      default:
        return <Clock className="w-4 h-4" />
    }
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'price_update':
        return 'bg-blue-500'
      case 'item_added':
        return 'bg-green-500'
      case 'item_paused':
        return 'bg-yellow-500'
      case 'item_resumed':
        return 'bg-green-500'
      case 'issue_detected':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date()
    const time = new Date(timestamp)
    const diffMinutes = Math.floor((now.getTime() - time.getTime()) / 60000)
    
    if (diffMinutes < 1) return 'agora'
    if (diffMinutes < 60) return `${diffMinutes}min`
    
    const diffHours = Math.floor(diffMinutes / 60)
    if (diffHours < 24) return `${diffHours}h`
    
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}d`
  }

  if (isLoading) {
    return (
      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Atividade Recente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg animate-pulse">
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!activities || activities.length === 0) {
    return (
      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Atividade Recente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Nenhuma atividade recente encontrada
            </p>
          </div>
        </CardContent>
      </Card>
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
                </div>
                
                <div className="flex flex-col items-end gap-1">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatTimeAgo(activity.timestamp)}
                  </span>
                  {activity.metadata?.newPrice && (
                    <Badge variant="secondary" className="text-xs">
                      R$ {activity.metadata.newPrice.toFixed(2)}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
        
        <div className="pt-2 border-t">
          <button 
            className="text-sm text-primary hover:underline w-full text-center"
            onClick={onViewHistory}
          >
            Ver histórico completo
          </button>
        </div>
      </CardContent>
    </Card>
  )
}
