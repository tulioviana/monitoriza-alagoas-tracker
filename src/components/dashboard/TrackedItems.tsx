
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Monitor, Pause, Play, Trash2, TrendingDown, TrendingUp } from 'lucide-react'

export function TrackedItems() {
  // Mock data for now - this will be replaced with real data from Supabase
  const mockTrackedItems = [
    {
      id: 1,
      nickname: 'Arroz Tio João - Carrefour',
      item_type: 'produto',
      current_price: 5.49,
      last_price: 5.99,
      establishment: 'Carrefour Maceió',
      last_updated: '2024-01-15T10:30:00Z',
      is_active: true
    },
    {
      id: 2,
      nickname: 'Gasolina Comum - Posto Shell',
      item_type: 'combustivel',
      current_price: 5.89,
      last_price: 5.85,
      establishment: 'Shell - Jatiúca',
      last_updated: '2024-01-15T09:15:00Z',
      is_active: true
    }
  ]

  const getPriceChange = (current: number, previous: number) => {
    if (current < previous) {
      return { 
        type: 'down', 
        percentage: ((previous - current) / previous * 100).toFixed(1),
        icon: TrendingDown,
        className: 'text-green-600'
      }
    } else if (current > previous) {
      return { 
        type: 'up', 
        percentage: ((current - previous) / previous * 100).toFixed(1),
        icon: TrendingUp,
        className: 'text-red-600'
      }
    }
    return null
  }

  if (mockTrackedItems.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <Monitor className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhum item monitorado</h3>
          <p className="text-muted-foreground text-center mb-4">
            Comece a monitorar produtos e combustíveis para acompanhar suas variações de preço
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {mockTrackedItems.map((item) => {
        const priceChange = getPriceChange(item.current_price, item.last_price)
        const PriceIcon = priceChange?.icon

        return (
          <Card key={item.id}>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <CardTitle className="text-lg">{item.nickname}</CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <Badge variant={item.item_type === 'produto' ? 'default' : 'secondary'}>
                      {item.item_type === 'produto' ? 'Produto' : 'Combustível'}
                    </Badge>
                    <span>•</span>
                    <span>{item.establishment}</span>
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => console.log('Toggle tracking for', item.id)}
                  >
                    {item.is_active ? (
                      <>
                        <Pause className="h-4 w-4 mr-1" />
                        Pausar
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-1" />
                        Ativar
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => console.log('Delete', item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold">
                      R$ {item.current_price.toFixed(2)}
                    </span>
                    {priceChange && PriceIcon && (
                      <div className={`flex items-center gap-1 ${priceChange.className}`}>
                        <PriceIcon className="h-4 w-4" />
                        <span className="text-sm font-medium">
                          {priceChange.percentage}%
                        </span>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Preço anterior: R$ {item.last_price.toFixed(2)}
                  </p>
                </div>

                <div className="text-right">
                  <div className={`text-sm ${item.is_active ? 'text-green-600' : 'text-yellow-600'}`}>
                    {item.is_active ? 'Ativo' : 'Pausado'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Atualizado: {new Date(item.last_updated).toLocaleString('pt-BR')}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
