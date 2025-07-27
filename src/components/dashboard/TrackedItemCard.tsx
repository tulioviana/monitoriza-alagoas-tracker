import { CheckCircle, Pause, TrendingDown, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { TrackedItemActions } from './TrackedItemActions'
import { TrackedItemWithPrice } from '@/hooks/useTrackedItems'
import { formatRelativeTime, formatExactDateTime, formatCurrency } from '@/lib/dateUtils'

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
        className: 'text-green-600 bg-green-50'
      }
    } else if (current > previous) {
      return { 
        type: 'up', 
        percentage: ((current - previous) / previous * 100).toFixed(1),
        icon: TrendingUp,
        className: 'text-red-600 bg-red-50'
      }
    }
    return null
  }

  const priceChange = item.current_price && item.last_price 
    ? getPriceChange(item.current_price, item.last_price) 
    : null
  
  const PriceIcon = priceChange?.icon

  return (
    <Card className="h-full transition-all duration-200 hover:shadow-md hover:scale-[1.02]">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-lg leading-tight truncate flex-1">
            {item.nickname}
          </h3>
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
        <div className="space-y-2">
          {item.current_price ? (
            <>
              <div className="text-3xl font-bold text-foreground">
                {formatCurrency(item.current_price)}
              </div>
              
              {priceChange && PriceIcon && (
                <div className="flex items-center gap-2">
                  <Badge 
                    variant="secondary" 
                    className={`${priceChange.className} border-0 font-medium px-2 py-1`}
                  >
                    <PriceIcon className="h-3 w-3 mr-1" />
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
                <div className="text-sm text-muted-foreground">
                  Preço anterior: {formatCurrency(item.last_price)}
                </div>
              )}
            </>
          ) : (
            <div className="text-2xl font-bold text-muted-foreground">
              Aguardando preços
            </div>
          )}
        </div>

        {/* Metadata Section */}
        <div className="space-y-3 pt-2 border-t">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={item.item_type === 'produto' ? 'default' : 'secondary'}>
              {item.item_type === 'produto' ? 'Produto' : 'Combustível'}
            </Badge>
            <span className="text-sm text-muted-foreground truncate flex-1">
              {item.establishment || 'Aguardando dados'}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <Badge 
              variant="secondary" 
              className={`${
                item.is_active 
                  ? 'bg-green-100 text-green-700 border-green-200' 
                  : 'bg-yellow-100 text-yellow-700 border-yellow-200'
              }`}
            >
              {item.is_active ? (
                <CheckCircle className="h-3 w-3 mr-1" />
              ) : (
                <Pause className="h-3 w-3 mr-1" />
              )}
              {item.is_active ? 'Ativo' : 'Pausado'}
            </Badge>
            
            {item.last_updated && (
              <Tooltip>
                <TooltipTrigger>
                  <span className="text-xs text-muted-foreground cursor-help">
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