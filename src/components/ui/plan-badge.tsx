import { Badge } from '@/components/ui/badge'
import { usePlan } from '@/contexts/PlanContext'
import { Crown, Zap } from 'lucide-react'

export function PlanBadge() {
  const { plan, isPro, loading } = usePlan()

  if (loading) {
    return <div className="w-16 h-6 bg-muted animate-pulse rounded" />
  }

  return (
    <Badge 
      variant={isPro ? 'default' : 'secondary'} 
      className={`gap-1 font-medium ${
        isPro 
          ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white hover:from-yellow-600 hover:to-orange-600' 
          : 'bg-muted text-muted-foreground'
      }`}
    >
      {isPro ? (
        <>
          <Crown className="w-3 h-3" />
          PRO
        </>
      ) : (
        <>
          <Zap className="w-3 h-3" />
          LITE
        </>
      )}
    </Badge>
  )
}