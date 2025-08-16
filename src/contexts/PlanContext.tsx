import React, { createContext, useContext, ReactNode, useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'

type UserPlan = 'lite' | 'pro'

interface PlanContextType {
  plan: UserPlan
  isPro: boolean
  isLite: boolean
  hasAccess: (feature: string) => boolean
  loading: boolean
  refreshPlan: () => Promise<void>
}

const PlanContext = createContext<PlanContextType | undefined>(undefined)

const PRO_FEATURES = ['monitored', 'market-intelligence']
const ALL_FEATURES = ['dashboard', 'products', 'fuels', 'history', 'settings', ...PRO_FEATURES]

interface PlanProviderProps {
  children: ReactNode
}

export function PlanProvider({ children }: PlanProviderProps) {
  const { user } = useAuth()
  const [plan, setPlan] = useState<UserPlan>('lite')
  const [loading, setLoading] = useState(true)

  const fetchUserPlan = async () => {
    if (!user?.id) {
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('plan')
        .eq('id', user.id)
        .single()

      if (error) throw error
      
      setPlan((data?.plan as UserPlan) || 'lite')
    } catch (error) {
      console.error('Error fetching user plan:', error)
      setPlan('lite')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUserPlan()
  }, [user?.id])

  const refreshPlan = async () => {
    await fetchUserPlan()
  }

  const isPro = plan === 'pro'
  const isLite = plan === 'lite'

  const hasAccess = (feature: string): boolean => {
    if (!ALL_FEATURES.includes(feature)) return false
    if (isPro) return true
    return !PRO_FEATURES.includes(feature)
  }

  const value: PlanContextType = {
    plan,
    isPro,
    isLite,
    hasAccess,
    loading,
    refreshPlan,
  }

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>
}

export function usePlan() {
  const context = useContext(PlanContext)
  if (context === undefined) {
    throw new Error('usePlan must be used within a PlanProvider')
  }
  return context
}