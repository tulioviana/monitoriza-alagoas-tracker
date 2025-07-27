import { CheckCircle, Pause, TrendingDown, TrendingUp, Activity } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { TrackedItemActions } from './TrackedItemActions'
import { TrackedItemWithPrice } from '@/hooks/useTrackedItems'
import { formatRelativeTime, formatExactDateTime, formatCurrency } from '@/lib/dateUtils'
import { cn } from '@/lib/utils'

interface TrackedItemCardProps {
  item: TrackedItemWithPrice
  onToggle: (id: number, currentStatus: boolean) => void
  onDelete: (id: number) => void
  isToggling?: boolean
  isDeleting?: boolean
}

export function TrackedItemCard({
  item,
  onToggle,
  onDelete,
  isToggling = false,
  isDeleting = false
}: TrackedItemCardProps) {
  const getPriceChange = (current: number, previous: number) => {
    if (current < previous) {
      return { 
        type: 'down', 
        percentage: ((previous - current) / previous * 100).toFixed(1),
        icon: TrendingDown,
        className: 'text-success bg-success/10 border-success/20',
        cardClassName: 'border-success/30 shadow-[0_0_15px_rgba(34,197,94,0.15)]'
      }
    } else if (current > previous) {
      return { 
        type: 'up', 
        percentage: ((current - previous) / previous * 100).toFixed(1),
        icon: TrendingUp,
        className: 'text-error bg-error/10 border-error/20',
        cardClassName: 'border-error/30 shadow-[0_0_15px_rgba(239,68,68,0.15)]'
      }
    }
    return null
  }

  const priceChange = item.current_price && item.last_price 
    ? getPriceChange(item.current_price, item.last_price) 
    : null
  
  const PriceIcon = priceChange?.icon

  // Determinar estilo do card baseado no status e variação de preço
  const getCardStyle = () => {
    if (!item.is_active) {
      return 'border-warning/30 bg-gradient-to-br from-card to-warning/5 opacity-75'
    }
    
    if (priceChange) {
      return `${priceChange.cardClassName} bg-gradient-to-br from-card to-card-hover`
    }
    
    if (item.current_price) {
      return 'border-primary/20 bg-gradient-to-br from-card to-primary/5'
    }
    
    return 'border-muted bg-gradient-to-br from-card to-muted/30'
  }

  return (
    <Card className={cn(
      "h-full transition-all duration-300 hover:shadow-strong hover:scale-[1.02] group relative overflow-hidden",
      getCardStyle(),
      item.is_active && "hover:shadow-primary/10",
      // Animação de pulsação sutil para itens ativos
      item.is_active && item.current_price && "animate-pulse-glow"
    )}>
      <CardHeader className="pb-3 relative">
        {/* Indicador de status visual no topo */}
        <div className={cn(
          "absolute top-0 left-0 right-0 h-1 rounded-t-lg transition-all duration-300",
          item.is_active ? "bg-primary" : "bg-warning",
          item.is_active && "group-hover:h-2"
        )} />
        
        <div className="flex items-start justify-between gap-2 mt-1">
          <div className="flex items-center gap-2 flex-1">
            <h3 className="font-semibold text-lg leading-tight truncate">
              {item.nickname}
            </h3>
            {item.is_active && item.current_price && (
              <Activity className="h-4 w-4 text-primary animate-pulse" />
            )}
          </div>
          <TrackedItemActions
            isActive={item.is_active}
            onToggle={() => onToggle(item.id, item.is_active)}
            onDelete={() => onDelete(item.id)}
            isToggling={isToggling}
            isDeleting={isDeleting}
          />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Price Section */}
        <div className="space-y-3">
          {item.current_price ? (
            <>
              <div className="text-4xl font-bold text-foreground tracking-tight group-hover:scale-105 transition-transform duration-200">
                {formatCurrency(item.current_price)}
              </div>
              
              {priceChange && PriceIcon && (
                <div className="flex items-center gap-3">
                  <Badge 
                    variant="secondary" 
                    className={cn(
                      "font-medium px-3 py-1.5 text-sm border transition-all duration-200",
                      priceChange.className,
                      "group-hover:scale-105 shadow-soft"
                    )}
                  >
                    <PriceIcon className="h-4 w-4 mr-1.5" />
                    {priceChange.type === 'down' ? '-' : '+'}{priceChange.percentage}%
                  </Badge>
                  {item.last_price && (
                    <span className="text-sm text-muted-foreground">
                      Anterior: {formatCurrency(item.last_price)}
                    </span>
                  )}
                </div>
              )}
              
              {!priceChange && item.last_price && (
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <div className="w-2 h-2 bg-muted-foreground/30 rounded-full" />
                  Preço anterior: {formatCurrency(item.last_price)}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-4">
              <div className="text-2xl font-bold text-muted-foreground mb-2">
                Aguardando preços
              </div>
              <div className="flex justify-center">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Metadata Section */}
        <div className="space-y-3 pt-4 border-t border-border/50">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge 
              variant={item.item_type === 'produto' ? 'default' : 'secondary'}
              className="transition-colors duration-200"
            >
              {item.item_type === 'produto' ? 'Produto' : 'Combustível'}
            </Badge>
            <span className="text-sm text-muted-foreground truncate flex-1 font-medium">
              {item.establishment || 'Aguardando dados'}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <Badge 
              variant="secondary" 
              className={cn(
                "font-medium transition-all duration-200 border",
                item.is_active 
                  ? 'bg-success/10 text-success border-success/20 hover:bg-success/20' 
                  : 'bg-warning/10 text-warning border-warning/20 hover:bg-warning/20'
              )}
            >
              {item.is_active ? (
                <CheckCircle className="h-3 w-3 mr-1.5" />
              ) : (
                <Pause className="h-3 w-3 mr-1.5" />
              )}
              {item.is_active ? 'Ativo' : 'Pausado'}
            </Badge>
            
            {item.last_updated && (
              <Tooltip>
                <TooltipTrigger>
                  <span className="text-xs text-muted-foreground cursor-help hover:text-foreground transition-colors duration-200 font-medium">
                    {formatRelativeTime(item.last_updated)}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{formatExactDateTime(item.last_updated)}</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}