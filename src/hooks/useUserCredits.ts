import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

interface UserCredits {
  current_balance: number
  total_purchased: number
  total_consumed: number
}

interface CreditTransaction {
  id: string
  transaction_type: 'purchase' | 'consumption' | 'admin_adjustment' | 'refund' | 'bonus'
  amount: number
  description: string | null
  created_at: string
  metadata: any
}

export function useUserCredits() {
  const [credits, setCredits] = useState<UserCredits | null>(null)
  const [loading, setLoading] = useState(true)
  const [isConsuming, setIsConsuming] = useState(false)
  const { user } = useAuth()
  const { toast } = useToast()

  const fetchCredits = async () => {
    if (!user?.id) {
      setCredits(null)
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('user_credits')
        .select('current_balance, total_purchased, total_consumed')
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching credits:', error)
        // If no credits record exists, create one with 0 balance
        if (error.code === 'PGRST116') {
          setCredits({ current_balance: 0, total_purchased: 0, total_consumed: 0 })
        }
      } else {
        setCredits(data || { current_balance: 0, total_purchased: 0, total_consumed: 0 })
      }
    } catch (error) {
      console.error('Error fetching credits:', error)
      setCredits({ current_balance: 0, total_purchased: 0, total_consumed: 0 })
    } finally {
      setLoading(false)
    }
  }

  const consumeCredit = async (description = 'Busca realizada', referenceId?: string): Promise<boolean> => {
    if (!user?.id || isConsuming) return false

    setIsConsuming(true)
    try {
      const { data, error } = await supabase.rpc('consume_credit', {
        p_user_id: user.id,
        p_description: description,
        p_reference_id: referenceId
      })

      if (error) {
        console.error('Error consuming credit:', error)
        toast({
          title: "Erro",
          description: "Erro ao processar crédito. Tente novamente.",
          variant: "destructive",
        })
        return false
      }

      if (!data) {
        toast({
          title: "Créditos insuficientes",
          description: "Você não possui créditos suficientes para realizar esta busca.",
          variant: "destructive",
        })
        return false
      }

      // Refresh credits after consumption
      await fetchCredits()
      return true
    } catch (error) {
      console.error('Error consuming credit:', error)
      toast({
        title: "Erro",
        description: "Erro ao processar crédito. Tente novamente.",
        variant: "destructive",
      })
      return false
    } finally {
      setIsConsuming(false)
    }
  }

  const getCreditBalance = async (): Promise<number> => {
    if (!user?.id) return 0
    
    try {
      const { data, error } = await supabase.rpc('get_user_credits', {
        p_user_id: user.id
      })

      if (error) {
        console.error('Error getting credit balance:', error)
        return 0
      }

      return data || 0
    } catch (error) {
      console.error('Error getting credit balance:', error)
      return 0
    }
  }

  const fetchTransactionHistory = async (limit = 50): Promise<CreditTransaction[]> => {
    if (!user?.id) return []

    try {
      const { data, error } = await supabase
        .from('credit_transactions')
        .select('id, transaction_type, amount, description, created_at, metadata')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('Error fetching transaction history:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error fetching transaction history:', error)
      return []
    }
  }

  const hasCredits = () => {
    return credits ? credits.current_balance > 0 : false
  }

  useEffect(() => {
    fetchCredits()
  }, [user?.id])

  // Subscribe to real-time updates
  useEffect(() => {
    if (!user?.id) return

    const channel = supabase
      .channel('user_credits_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_credits',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchCredits()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id])

  return {
    credits,
    loading,
    isConsuming,
    fetchCredits,
    consumeCredit,
    getCreditBalance,
    fetchTransactionHistory,
    hasCredits,
    refresh: fetchCredits
  }
}