import { useUserCredits } from '@/hooks/useUserCredits'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Coins, AlertCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CreditCounterProps {
  className?: string
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function CreditCounter({ className, showLabel = true, size = 'md' }: CreditCounterProps) {
  const { credits, loading, hasCredits } = useUserCredits()

  if (loading) {
    return (
      <Card className={cn("p-4 border-border/50", className)}>
        <div className="flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Carregando...</span>
        </div>
      </Card>
    )
  }

  const currentBalance = credits?.current_balance || 0
  const isLowCredits = currentBalance <= 5 && currentBalance > 0
  const isNoCredits = currentBalance === 0

  const getVariant = () => {
    if (isNoCredits) return 'error'
    if (isLowCredits) return 'outline'
    return 'secondary'
  }

  const getIcon = () => {
    if (isNoCredits) return <AlertCircle className="h-4 w-4" />
    return <Coins className="h-4 w-4" />
  }

  const sizeClasses = {
    sm: 'p-2 text-xs',
    md: 'p-3 text-sm',
    lg: 'p-4 text-base'
  }

  return (
    <Card className={cn("border-border/50 transition-all duration-200", className)}>
      <div className={cn("flex items-center gap-2", sizeClasses[size])}>
        {getIcon()}
        <div className="flex items-center gap-2">
          {showLabel && (
            <span className="font-medium text-foreground">
              Créditos:
            </span>
          )}
          <Badge variant={getVariant()} className="font-mono">
            {currentBalance}
          </Badge>
        </div>
      </div>
      
      {isLowCredits && (
        <div className="px-3 pb-2">
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Seus créditos estão acabando!
          </p>
        </div>
      )}
      
      {isNoCredits && (
        <div className="px-3 pb-2">
          <p className="text-xs text-red-600 dark:text-red-400">
            Você não possui créditos para realizar buscas.
          </p>
        </div>
      )}
    </Card>
  )
}