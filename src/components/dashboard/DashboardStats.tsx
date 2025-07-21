import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/loading'
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Target, 
  Activity,
  MapPin,
  Clock,
  AlertTriangle
} from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  change?: {
    value: number
    type: 'positive' | 'negative' | 'neutral'
    period: string
  }
  icon: React.ReactNode
  description?: string
  loading?: boolean
}

function StatCard({ title, value, change, icon, description, loading }: StatCardProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          {icon}
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-20 mb-2" />
          <Skeleton className="h-4 w-full" />
        </CardContent>
      </Card>
    )
  }

  const getChangeIcon = () => {
    if (!change) return null
    
    switch (change.type) {
      case 'positive':
        return <TrendingUp className="w-3 h-3 text-success" />
      case 'negative':
        return <TrendingDown className="w-3 h-3 text-destructive" />
      default:
        return <Activity className="w-3 h-3 text-muted-foreground" />
    }
  }

  const getChangeColor = () => {
    if (!change) return 'text-muted-foreground'
    
    switch (change.type) {
      case 'positive':
        return 'text-success'
      case 'negative':
        return 'text-destructive'
      default:
        return 'text-muted-foreground'
    }
  }

  return (
    <Card className="transition-all duration-200 hover:shadow-medium">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="w-4 h-4 text-muted-foreground">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground mb-1">
          {value}
        </div>
        {change && (
          <div className={`flex items-center gap-1 text-xs ${getChangeColor()}`}>
            {getChangeIcon()}
            <span>
              {change.value > 0 ? '+' : ''}{change.value}% {change.period}
            </span>
          </div>
        )}
        {description && (
          <p className="text-xs text-muted-foreground mt-1">
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export function DashboardStats() {
  const stats = [
    {
      title: 'Itens Monitorados',
      value: 12,
      change: { value: 20, type: 'positive' as const, period: 'este mês' },
      icon: <Target className="w-4 h-4" />,
      description: 'Produtos e combustíveis ativos'
    },
    {
      title: 'Economia Total',
      value: 'R$ 1.247,80',
      change: { value: 15, type: 'positive' as const, period: 'este mês' },
      icon: <DollarSign className="w-4 h-4" />,
      description: 'Economizado com monitoramento'
    },
    {
      title: 'Postos Monitorados',
      value: 28,
      change: { value: 5, type: 'positive' as const, period: 'esta semana' },
      icon: <MapPin className="w-4 h-4" />,
      description: 'Estabelecimentos em análise'
    },
    {
      title: 'Alertas Ativos',
      value: 5,
      change: { value: -12, type: 'negative' as const, period: 'hoje' },
      icon: <AlertTriangle className="w-4 h-4" />,
      description: 'Variações de preço importantes'
    },
    {
      title: 'Última Atualização',
      value: '2 min',
      icon: <Clock className="w-4 h-4" />,
      description: 'Dados em tempo real'
    },
    {
      title: 'Tendência Geral',
      value: 'Estável',
      change: { value: 2, type: 'positive' as const, period: 'tendência' },
      icon: <Activity className="w-4 h-4" />,
      description: 'Análise do mercado regional'
    }
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {stats.map((stat, index) => (
        <StatCard key={index} {...stat} />
      ))}
    </div>
  )
}