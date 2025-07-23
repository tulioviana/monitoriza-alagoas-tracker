
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Monitor, Pause, Play, Trash2, TrendingDown, TrendingUp, Loader2, Info } from 'lucide-react'
import { useTrackedItems, useToggleTrackedItem, useDeleteTrackedItem } from '@/hooks/useTrackedItems'

export function TrackedItems() {
  const { data: trackedItems, isLoading, error } = useTrackedItems()
  const toggleMutation = useToggleTrackedItem()
  const deleteMutation = useDeleteTrackedItem()

  const handleToggleItem = (id: number, currentStatus: boolean) => {
    toggleMutation.mutate({ id, is_active: !currentStatus })
  }

  const handleDeleteItem = (id: number) => {
    if (confirm('Tem certeza que deseja remover este item do monitoramento?')) {
      deleteMutation.mutate(id)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Carregando itens monitorados...</p>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <p className="text-red-600 mb-2">Erro ao carregar itens monitorados</p>
          <p className="text-muted-foreground text-sm">{error.message}</p>
        </CardContent>
      </Card>
    )
  }

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

  if (!trackedItems || trackedItems.length === 0) {
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
      {trackedItems.map((item) => {
        const priceChange = item.current_price && item.last_price 
          ? getPriceChange(item.current_price, item.last_price) 
          : null
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
                    <span>{item.establishment || 'Aguardando dados'}</span>
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleItem(item.id, item.is_active)}
                    disabled={toggleMutation.isPending}
                  >
                    {toggleMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : item.is_active ? (
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
                    onClick={() => handleDeleteItem(item.id)}
                    disabled={deleteMutation.isPending}
                  >
                    {deleteMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {item.current_price ? (
                      <>
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
                      </>
                    ) : (
                      <span className="text-2xl font-bold text-muted-foreground">
                        Aguardando preços
                      </span>
                    )}
                  </div>
                  {item.last_price && (
                    <p className="text-sm text-muted-foreground">
                      Preço anterior: R$ {item.last_price.toFixed(2)}
                    </p>
                  )}
                  {item.sale_date && item.fetch_date && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Transação: {new Date(item.sale_date).toLocaleString('pt-BR')}</span>
                      <span>•</span>
                      <span>Sincronizado: {new Date(item.fetch_date).toLocaleString('pt-BR')}</span>
                    </div>
                  )}
                </div>

                <div className="text-right">
                  <div className={`text-sm ${item.is_active ? 'text-green-600' : 'text-yellow-600'}`}>
                    {item.is_active ? 'Ativo' : 'Pausado'}
                  </div>
                  {item.fetch_date && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <span>Atualizado: {new Date(item.fetch_date).toLocaleString('pt-BR')}</span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-3 w-3" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Hora da última sincronização dos dados</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
