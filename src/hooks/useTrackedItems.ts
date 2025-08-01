import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

export interface TrackedItem {
  id: number
  nickname: string
  item_type: 'produto' | 'combustivel'
  search_criteria: any
  is_active: boolean
  created_at: string
  user_id: string
}

export interface TrackedItemWithPrice extends TrackedItem {
  current_price?: number
  declared_price?: number
  last_price?: number
  last_declared_price?: number
  establishment?: string
  cnpj?: string
  last_updated?: string
}

export function useTrackedItems() {
  return useQuery({
    queryKey: ['tracked-items'],
    queryFn: async () => {
      const { data: trackedItems, error } = await supabase
        .from('tracked_items')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      // Get latest prices for each tracked item
      const itemsWithPrices = await Promise.all(
        trackedItems.map(async (item) => {
          const { data: priceHistory } = await supabase
            .from('price_history')
            .select(`
              sale_price,
              declared_price,
              sale_date,
              establishments!inner(
                razao_social,
                nome_fantasia,
                cnpj
              )
            `)
            .eq('tracked_item_id', item.id)
            .order('sale_date', { ascending: false })
            .limit(2)

          const current = priceHistory?.[0]
          const previous = priceHistory?.[1]

          return {
            ...item,
            current_price: current?.sale_price,
            declared_price: current?.declared_price,
            last_price: previous?.sale_price,
            last_declared_price: previous?.declared_price,
            establishment: current?.establishments?.nome_fantasia || current?.establishments?.razao_social,
            cnpj: current?.establishments?.cnpj,
            last_updated: current?.sale_date
          } as TrackedItemWithPrice
        })
      )

      return itemsWithPrices
    }
  })
}

export function useToggleTrackedItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: number; is_active: boolean }) => {
      const { error } = await supabase
        .from('tracked_items')
        .update({ is_active })
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracked-items'] })
      toast.success('Status do item atualizado')
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar item: ${error.message}`)
    }
  })
}

export function useDeleteTrackedItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('tracked_items')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracked-items'] })
      toast.success('Item removido com sucesso')
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover item: ${error.message}`)
    }
  })
}

export function useCreateTrackedItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (item: Omit<TrackedItem, 'id' | 'created_at' | 'user_id'>) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { error } = await supabase
        .from('tracked_items')
        .insert({
          ...item,
          user_id: user.id
        })

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracked-items'] })
      toast.success('Item adicionado ao monitoramento')
    },
    onError: (error: Error) => {
      toast.error(`Erro ao adicionar item: ${error.message}`)
    }
  })
}