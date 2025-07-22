
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  RefreshCw,
  Settings
} from 'lucide-react'
import { useDashboardStats } from '@/hooks/useDashboardStats'
import { useTrackedItems } from '@/hooks/useTrackedItems'

interface SystemHealthProps {
  onTabChange: (tab: string) => void
}

export function SystemHealth({ onTabChange }: SystemHealthProps) {
  const { data: stats } = useDashboardStats()
  const { data: trackedItems } = useTrackedItems()

  const getHealthStatus = () => {
    if (!stats) return { status: 'loading', message: 'Carregando...' }
    
    if (stats.itemsWithIssues > 0) {
      return { 
        status: 'warning', 
        message: `${stats.itemsWithIssues} item(s) com problemas detectados` 
      }
    }
    
    if (stats.activeItems === 0) {
      return { 
        status: 'info', 
        message: 'Nenhum item sendo monitorado' 
      }
    }
    
    return { 
      status: 'healthy', 
      message: 'Sistema funcionando normalmente' 
    }
  }

  const health = getHealthStatus()

  const getStatusIcon = () => {
    switch (health.status) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />
      case 'info':
        return <Clock className="w-5 h-5 text-blue-600" />
      default:
        return <RefreshCw className="w-5 h-5 text-gray-600 animate-spin" />
    }
  }

  const getStatusColor = () => {
    switch (health.status) {
      case 'healthy':
        return 'bg-green-50 border-green-200'
      case 'warning':
        return 'bg-yellow-50 border-yellow-200'
      case 'info':
        return 'bg-blue-50 border-blue-200'
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }

  const itemsNeedingAttention = trackedItems?.filter(item => 
    item.is_active && (!item.current_price || !item.last_updated)
  ) || []

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getStatusIcon()}
          Status do Sistema
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className={`p-4 rounded-lg border-2 ${getStatusColor()}`}>
          <p className="text-sm font-medium">{health.message}</p>
        </div>

        {itemsNeedingAttention.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">
              Itens que precisam de atenção:
            </h4>
            <div className="space-y-2">
              {itemsNeedingAttention.slice(0, 3).map((item) => (
                <div key={item.id} className="flex items-center justify-between p-2 bg-muted rounded">
                  <div>
                    <p className="text-sm font-medium">{item.nickname}</p>
                    <p className="text-xs text-muted-foreground">
                      {!item.current_price ? 'Aguardando primeira coleta' : 'Sem atualizações recentes'}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {item.item_type}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => onTabChange('tracked')}
          >
            <Settings className="w-4 h-4 mr-2" />
            Gerenciar Itens
          </Button>
          
          {stats && stats.itemsWithIssues > 0 && (
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
