import { CheckCircle, Pause, TrendingDown, TrendingUp, Activity, Play, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { PriceDisplay } from '@/components/ui/price-display';
import { TrackedItemWithPrice } from '@/hooks/useTrackedItems';
import { formatRelativeTime, formatExactDateTime, formatCnpj, formatCurrency } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';
interface TrackedItemCardProps {
  item: TrackedItemWithPrice;
  onToggle: (id: number, currentStatus: boolean) => void;
  onDelete: (id: number) => void;
  isToggling?: boolean;
  isDeleting?: boolean;
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
      };
    } else if (current > previous) {
      return {
        type: 'up',
        percentage: ((current - previous) / previous * 100).toFixed(1),
        icon: TrendingUp,
        className: 'text-error bg-error/10 border-error/20',
        cardClassName: 'border-error/30 shadow-[0_0_15px_rgba(239,68,68,0.15)]'
      };
    }
    return null;
  };
  const priceChange = item.current_price && item.last_price ? getPriceChange(item.current_price, item.last_price) : null;
  const PriceIcon = priceChange?.icon;

  // Determinar estilo do card baseado no status (padronizando as bordas)
  const getCardStyle = () => {
    if (!item.is_active) {
      return 'border-warning/30 bg-gradient-to-br from-card to-warning/5';
    }
    return 'border-success/30 bg-gradient-to-br from-card to-success/5';
  };
  return <Card className={cn("h-full transition-all duration-300 hover:shadow-strong hover:scale-[1.02] group relative overflow-hidden", getCardStyle(), item.is_active && "hover:shadow-primary/10")}>
      <CardHeader className="pb-3 relative">
        {/* Indicador de status visual no topo */}
        <div className={cn("absolute top-0 left-0 right-0 h-1 rounded-t-lg transition-all duration-300", item.is_active ? "bg-success" : "bg-warning", item.is_active && "group-hover:h-2")} />
        
        <div className="flex items-start justify-between gap-2 mt-1">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg leading-tight">
              {item.nickname}
            </h3>
          </div>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={item.is_active ? "outline" : "default"}
                  size="sm"
                  onClick={() => onToggle(item.id, item.is_active)}
                  disabled={isToggling}
                  className="h-8 w-8 p-0"
                >
                  {item.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {item.is_active ? 'Pausar monitoramento' : 'Retomar monitoramento'}
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDelete(item.id)}
                  disabled={isDeleting}
                  className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Excluir item
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Price Section */}
        <div className="space-y-3">
          {item.current_price ? (
            <PriceDisplay
              declaredPrice={item.declared_price}
              salePrice={item.current_price}
              size="lg"
              showDifference={true}
              className="group-hover:scale-105 transition-transform duration-200"
            />
          ) : (
            <div className="text-center py-4">
              <div className="text-2xl font-bold text-muted-foreground mb-2">
                Aguardando preços
              </div>
              <div className="flex justify-center">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{
                animationDelay: '0ms'
              }} />
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{
                animationDelay: '150ms'
              }} />
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{
                animationDelay: '300ms'
              }} />
                </div>
              </div>
            </div>
          )}
          
          {/* Preço Anterior */}
          {item.last_price && (
            <div className="text-sm text-muted-foreground flex items-center gap-2 pt-2 border-t border-border/30">
              <div className="w-2 h-2 bg-muted-foreground/30 rounded-full" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="cursor-help hover:text-foreground transition-colors">
                    Preço anterior: {formatCurrency(item.last_price)}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Penúltimo preço de venda registrado</p>
                </TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>

        {/* Metadata Section */}
        <div className="space-y-3 pt-4 border-t border-border/50">
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground font-medium">
              {item.establishment || 'Aguardando dados'}
              {item.cnpj && <span className="ml-2 text-xs">• CNPJ: {formatCnpj(item.cnpj)}</span>}
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant={item.item_type === 'produto' ? 'default' : 'secondary'} className="transition-colors duration-200">
                  {item.item_type === 'produto' ? 'Produto' : 'Combustível'}
                </Badge>
                <Badge variant="secondary" className={cn("font-medium transition-all duration-200 border", item.is_active ? 'bg-success/10 text-success border-success/20 hover:bg-success/20' : 'bg-warning/10 text-warning border-warning/20 hover:bg-warning/20')}>
                  {item.is_active ? <CheckCircle className="h-3 w-3 mr-1.5" /> : <Pause className="h-3 w-3 mr-1.5" />}
                  {item.is_active ? 'Ativo' : 'Pausado'}
                </Badge>
              </div>
              
              {item.last_updated && <Tooltip>
                  <TooltipTrigger>
                     <span className="text-xs text-muted-foreground cursor-help hover:text-foreground transition-colors duration-200 font-medium">
                       Último preço: {formatRelativeTime(item.last_updated)}
                     </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{formatExactDateTime(item.last_updated)}</p>
                  </TooltipContent>
                </Tooltip>}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>;
}