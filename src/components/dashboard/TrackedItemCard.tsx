import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Progress } from '@/components/ui/progress'
import { 
  Monitor, 
  Pause, 
  Play, 
  Trash2, 
  TrendingDown, 
  TrendingUp, 
  Loader2, 
  Info, 
  MoreVertical,
  Package,
  Fuel,
  MapPin,
  Calendar,
  DollarSign,
  History,
  Share2,
  Eye,
  Minus,
  Building2
} from 'lucide-react'
import { formatCNPJ } from '@/lib/formatters'

interface PriceChange {
  type: 'up' | 'down'
  percentage: string
  icon: typeof TrendingUp | typeof TrendingDown
  className: string
}

interface TrackedItemCardProps {
  item: {
    id: number
    nickname: string
    item_type: 'produto' | 'combustivel'
    establishment?: string | null
    establishment_cnpj?: string | null
    current_price?: number | null
    last_price?: number | null
    is_active: boolean
    sale_date?: string | null
    fetch_date?: string | null
  }
  onToggle: (id: number, currentStatus: boolean) => void
  onDelete: (id: number) => void
  isToggling: boolean
  isDeleting: boolean
}

export function TrackedItemCard({ item, onToggle, onDelete, isToggling, isDeleting }: TrackedItemCardProps) {
  const getPriceChange = (current: number, previous: number): PriceChange | null => {
    if (current < previous) {
      return { 
        type: 'down', 
        percentage: ((previous - current) / previous * 100).toFixed(1),
        icon: TrendingDown,
        className: 'text-success'
      }
    } else if (current > previous) {
      return { 
        type: 'up', 
        percentage: ((current - previous) / previous * 100).toFixed(1),
        icon: TrendingUp,
        className: 'text-error'
      }
    }
    return null
  }

  const priceChange = item.current_price && item.last_price 
    ? getPriceChange(item.current_price, item.last_price) 
    : null
  
  const PriceIcon = priceChange?.icon
  const savings = priceChange?.type === 'down' && item.current_price && item.last_price
    ? item.last_price - item.current_price
    : 0

  // Simular progresso de economia (exemplo)
  const savingsProgress = Math.min((savings / 10) * 100, 100)

  return (
    <Card className={`
      hover-lift transition-all duration-normal relative overflow-hidden group
      ${item.is_active ? 'border-success/20 bg-gradient-to-br from-card to-success/5' : 'border-warning/20 bg-gradient-to-br from-card to-warning/5'}
    `}>
      {/* Status Indicator */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${item.is_active ? 'bg-gradient-to-r from-success to-success/80' : 'bg-warning'}`} />
      
      {/* Recently Updated Pulse */}
      {item.fetch_date && new Date(item.fetch_date).getTime() > Date.now() - 60000 && (
        <div className="absolute top-3 right-3 w-2 h-2 bg-success rounded-full animate-pulse-glow" />
      )}

      <CardHeader className="pb-3">
        <div className="flex justify-between items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2 rounded-lg ${item.item_type === 'produto' ? 'bg-info/10' : 'bg-secondary/80'}`}>
                {item.item_type === 'produto' ? (
                  <Package className={`h-5 w-5 ${item.item_type === 'produto' ? 'text-info' : 'text-secondary-foreground'}`} />
                ) : (
                  <Fuel className="h-5 w-5 text-secondary-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-display-lg font-bold text-foreground truncate">{item.nickname}</h3>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <Badge variant={item.item_type === 'produto' ? 'outline' : 'secondary'} className="text-body-xs">
                {item.item_type === 'produto' ? 'Produto' : 'Combustível'}
              </Badge>
              
              <Badge variant={item.is_active ? 'outline' : 'secondary'} className={`text-body-xs ${item.is_active ? 'text-success border-success/30' : 'text-warning border-warning/30'}`}>
                {item.is_active ? 'Ativo' : 'Pausado'}
              </Badge>
            </div>

            {/* Establishment Information */}
            {(item.establishment || item.establishment_cnpj) && (
              <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 text-body-sm">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-foreground">Estabelecimento Monitorado</span>
                </div>
                
                {item.establishment && (
                  <div className="flex items-center gap-2 text-body-sm">
                    <MapPin className="h-3 w-3 text-muted-foreground" />
                    <span className="text-foreground font-medium truncate">{item.establishment}</span>
                  </div>
                )}
                
                {item.establishment_cnpj && (
                  <div className="text-body-xs text-muted-foreground">
                    <span className="font-medium">CNPJ:</span> {formatCNPJ(item.establishment_cnpj)}
                  </div>
                )}
              </div>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => onToggle(item.id, item.is_active)}>
                {item.is_active ? (
                  <>
                    <Pause className="h-4 w-4 mr-2" />
                    Pausar
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Ativar
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem>
                <History className="h-4 w-4 mr-2" />
                Histórico
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Share2 className="h-4 w-4 mr-2" />
                Compartilhar
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onDelete(item.id)}
                className="text-error focus:text-error"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Remover
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Price Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              {item.current_price ? (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-display-lg font-bold">
                      R$ {item.current_price.toFixed(2)}
                    </span>
                    {priceChange && PriceIcon && (
                      <div className={`flex items-center gap-1 ${priceChange.className}`}>
                        <PriceIcon className="h-4 w-4" />
                        <span className="text-body-sm font-medium">
                          {priceChange.percentage}%
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {item.last_price && (
                    <p className="text-body-sm text-muted-foreground">
                      Anterior: R$ {item.last_price.toFixed(2)}
                    </p>
                  )}
                </>
              ) : (
                <div className="space-y-2">
                  <span className="text-display-lg font-bold text-muted-foreground">
                    Aguardando preços
                  </span>
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-body-xs text-muted-foreground">Sincronizando...</span>
                  </div>
                </div>
              )}
            </div>

            {savings > 0 && (
              <div className="text-right">
                <div className="flex items-center gap-1 text-success">
                  <DollarSign className="h-4 w-4" />
                  <span className="text-body-md font-semibold">R$ {savings.toFixed(2)}</span>
                </div>
                <p className="text-body-xs text-muted-foreground">Economia</p>
              </div>
            )}
          </div>

          {/* Savings Progress */}
          {savings > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-body-xs">
                <span className="text-muted-foreground">Meta de economia</span>
                <span className="text-success font-medium">{savingsProgress.toFixed(0)}%</span>
              </div>
              <Progress value={savingsProgress} className="h-2" />
            </div>
          )}
        </div>

        {/* Timestamps */}
        {(item.sale_date || item.fetch_date) && (
          <div className="flex flex-col gap-1 pt-2 border-t border-border">
            {item.sale_date && (
              <div className="flex items-center gap-2 text-body-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>Transação: {new Date(item.sale_date).toLocaleString('pt-BR')}</span>
              </div>
            )}
            
            {item.fetch_date && (
              <div className="flex items-center gap-2 text-body-xs text-muted-foreground">
                <Info className="h-3 w-3" />
                <span>Sincronizado: {new Date(item.fetch_date).toLocaleString('pt-BR')}</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-3 w-3 opacity-50" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Última sincronização dos dados</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onToggle(item.id, item.is_active)}
            disabled={isToggling}
            className="flex-1"
          >
            {isToggling ? (
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
            className="px-3"
          >
            <Eye className="h-4 w-4" />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(item.id)}
            disabled={isDeleting}
            className="px-3"
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}