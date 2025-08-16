import { ReactNode } from 'react'
import { usePlan } from '@/contexts/PlanContext'
import { ProFeatureBanner } from './pro-feature-banner'

interface PlanGateProps {
  feature: string
  children: ReactNode
  fallback?: ReactNode
}

export function PlanGate({ feature, children, fallback }: PlanGateProps) {
  const { hasAccess, loading } = usePlan()

  if (loading) {
    return <div className="animate-pulse bg-muted rounded-lg h-32" />
  }

  if (!hasAccess(feature)) {
    return fallback || <ProFeatureBanner feature={feature} />
  }

  return <>{children}</>
}