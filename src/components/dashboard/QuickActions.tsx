
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Plus, 
  Search, 
  Bell, 
  BarChart3
} from 'lucide-react'

interface QuickActionProps {
  onTabChange: (tab: string) => void
}

export function QuickActions({ onTabChange }: QuickActionProps) {
  const actions = [
    {
      title: 'Buscar Produto',
      description: 'Encontre preços de produtos',
      icon: <Search className="w-5 h-5" />,
      color: 'bg-blue-500/10 text-blue-600 border-blue-200',
      onClick: () => onTabChange('products')
    },
    {
      title: 'Buscar Combustível',
      description: 'Compare preços de combustíveis',
      icon: <Plus className="w-5 h-5" />,
      color: 'bg-green-500/10 text-green-600 border-green-200',
      onClick: () => onTabChange('fuels')
    },
    {
      title: 'Ver Análises',
      description: 'Relatórios e gráficos',
      icon: <BarChart3 className="w-5 h-5" />,
      color: 'bg-purple-500/10 text-purple-600 border-purple-200',
      onClick: () => onTabChange('analytics'),
      badge: 'New'
    },
    {
      title: 'Configurar Alertas',
      description: 'Defina notificações personalizadas',
      icon: <Bell className="w-5 h-5" />,
      color: 'bg-orange-500/10 text-orange-600 border-orange-200',
      onClick: () => onTabChange('settings:notifications')
    }
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Ações Rápidas</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2">
          {actions.map((action, index) => (
            <button
              key={index}
              onClick={action.onClick}
              className={`
                p-4 rounded-lg border-2 text-left transition-all duration-200 
                hover:shadow-md hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary
                ${action.color}
              `}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  {action.icon}
                  <div>
                    <h3 className="font-medium text-sm">{action.title}</h3>
                    <p className="text-xs opacity-80 mt-1">{action.description}</p>
                  </div>
                </div>
                {action.badge && (
                  <Badge variant="secondary" className="text-xs">
                    {action.badge}
                  </Badge>
                )}
              </div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
