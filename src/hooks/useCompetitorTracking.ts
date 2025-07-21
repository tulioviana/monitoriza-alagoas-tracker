import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

export interface CompetitorTracking {
  id: number
  competitor_cnpj: string
  competitor_name?: string
  is_active: boolean
  created_at: string
  updated_at: string
  user_id: string
}

export interface CompetitorWithPrices extends CompetitorTracking {
  latest_prices?: Array<{
    produto_descricao: string
    sale_price: number
    sale_date: string
  }>
}

export function useCompetitorTracking() {
  return useQuery({
    queryKey: ['competitor-tracking'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('competitor_tracking')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as CompetitorTracking[]
    }
  })
}

export function useCompetitorPrices(competitorId: number) {
  return useQuery({
    queryKey: ['competitor-prices', competitorId],
    queryFn: async () => {
      if (!competitorId) return []
      
      const { data, error } = await supabase
        .from('competitor_price_history')
        .select(`
          *,
          competitor_tracking!inner(competitor_name, competitor_cnpj)
        `)
        .eq('competitor_tracking_id', competitorId)
        .order('sale_date', { ascending: false })
        .limit(100)

      if (error) {
        console.error('Error fetching competitor prices:', error)
        throw error
      }

      return data || []
    },
    enabled: !!competitorId
  })
}

// useAllCompetitorPrices hook to fetch all competitor price data
export function useAllCompetitorPrices() {
  return useQuery({
    queryKey: ['all-competitor-prices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('competitor_price_history')
        .select(`
          *,
          competitor_tracking!inner(competitor_name, competitor_cnpj)
        `)
        .order('sale_date', { ascending: false })
        .limit(500)

      if (error) {
        console.error('Error fetching all competitor prices:', error)
        throw error
      }

      return data || []
    }
  })
}

export function useAddCompetitorTracking() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ cnpj, name }: { cnpj: string; name?: string }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      // Validate CNPJ format
      const cleanCnpj = cnpj.replace(/\D/g, '')
      if (cleanCnpj.length !== 14) {
        throw new Error('CNPJ deve ter 14 dígitos')
      }

      // Check if competitor already exists for this user
      const { data: existing } = await supabase
        .from('competitor_tracking')
        .select('id')
        .eq('user_id', user.id)
        .eq('competitor_cnpj', cleanCnpj)
        .single()

      if (existing) {
        throw new Error('Este concorrente já está sendo monitorado')
      }

      const { error } = await supabase
        .from('competitor_tracking')
        .insert({
          user_id: user.id,
          competitor_cnpj: cleanCnpj,
          competitor_name: name
        })

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competitor-tracking'] })
      toast.success('Concorrente adicionado ao monitoramento')
    },
    onError: (error: Error) => {
      toast.error(`Erro ao adicionar concorrente: ${error.message}`)
    }
  })
}

export function useToggleCompetitorTracking() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: number; is_active: boolean }) => {
      const { error } = await supabase
        .from('competitor_tracking')
        .update({ is_active })
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competitor-tracking'] })
      toast.success('Status do concorrente atualizado')
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar concorrente: ${error.message}`)
    }
  })
}

export function useDeleteCompetitorTracking() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('competitor_tracking')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competitor-tracking'] })
      toast.success('Concorrente removido do monitoramento')
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover concorrente: ${error.message}`)
    }
  })
}