import { AlertTriangle, Info, TrendingDown, TrendingUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { formatCurrency } from '@/lib/dateUtils'
import { cn } from '@/lib/utils'

interface PriceDisplayProps {
  declaredPrice?: number | null
  salePrice: number
  size?: 'sm' | 'md' | 'lg'
  showDifference?: boolean
  className?: string
}

export function PriceDisplay({ 
  declaredPrice, 
  salePrice, 
  size = 'md', 
  showDifference = true,
  className 
}: PriceDisplayProps) {
  const difference = declaredPrice && salePrice ? salePrice - declaredPrice : null
  const discrepancyPercentage = difference && declaredPrice ? Math.abs(difference / declaredPrice * 100) : 0
  const hasSignificantDiscrepancy = discrepancyPercentage > 5 || (difference && Math.abs(difference) > 2)

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  }

  const getPriceDifferenceColor = (diff: number) => {
    if (Math.abs(diff) < 0.01) return 'secondary'
    return diff > 0 ? 'error' : 'success'
  }

  return (
    <TooltipProvider>
      <div className={cn('space-y-2', className)}>
        {/* Preço de Venda */}
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  Venda
                </Badge>
                <span className={cn('font-semibold text-foreground', sizeClasses[size])}>
                  {formatCurrency(salePrice)}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Preço real encontrado na venda - mais confiável para visita presencial</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Preço Declarado */}
        {declaredPrice ? (
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    <Info className="w-3 h-3 mr-1" />
                    Declarado
                  </Badge>
                  <span className={cn('text-muted-foreground', sizeClasses[size])}>
                    {formatCurrency(declaredPrice)}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Preço declarado pelo estabelecimento - pode não refletir promoções</p>
              </TooltipContent>
            </Tooltip>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs opacity-50">
              <Info className="w-3 h-3 mr-1" />
              Declarado
            </Badge>
            <span className={cn('text-muted-foreground', sizeClasses[size])}>
              N/A
            </span>
          </div>
        )}

        {/* Diferença e Alerta */}
        {showDifference && difference !== null && declaredPrice && (
          <div className="flex items-center gap-2">
            <Badge 
              variant={getPriceDifferenceColor(difference)}
              className="flex items-center gap-1 text-xs"
            >
              {difference > 0 ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              {difference > 0 ? '+' : ''}{formatCurrency(difference)}
            </Badge>
            
            {hasSignificantDiscrepancy && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="warning" className="flex items-center gap-1 text-xs">
                    <AlertTriangle className="w-3 h-3" />
                    Atenção
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Diferença significativa entre preços ({discrepancyPercentage.toFixed(1)}%)</p>
                  <p className="text-xs mt-1">Recomendamos validação presencial</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}