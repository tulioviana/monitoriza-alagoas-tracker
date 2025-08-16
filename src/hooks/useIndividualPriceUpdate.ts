import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'

interface UpdateResult {
  success: boolean
  message: string
  processedItems: number
  updatedItems: number
}

export function useIndividualPriceUpdate() {
  const { user } = useAuth()
  const [executionResult, setExecutionResult] = useState<UpdateResult | null>(null)
  const queryClient = useQueryClient()

  const updateMutation = useMutation({
    mutationFn: async (itemId: number): Promise<UpdateResult> => {
      if (!user?.id) {
        throw new Error('Usuário não autenticado')
      }

      // Invocar a edge function para atualizar um item específico
      const { data, error } = await supabase.functions.invoke('update-tracked-prices', {
        body: { 
          user_id: user.id,
          item_id: itemId // Passar o ID do item específico
        }
      })

      if (error) {
        console.error('Error invoking update function:', error)
        throw new Error(error.message || 'Erro ao atualizar preços')
      }

      return data
    },
    onSuccess: (result) => {
      setExecutionResult(result)
      
      if (result.success) {
        toast.success(`Item atualizado! ${result.updatedItems} preço(s) alterado(s)`)
        // Invalidar as queries relacionadas
        queryClient.invalidateQueries({ queryKey: ['tracked-items'] })
        queryClient.invalidateQueries({ queryKey: ['price-history'] })
      } else {
        toast.error(result.message || 'Erro ao atualizar item')
      }
    },
    onError: (error: Error) => {
      console.error('Individual update error:', error)
      toast.error(error.message || 'Erro ao atualizar preços do item')
      setExecutionResult({
        success: false,
        message: error.message,
        processedItems: 0,
        updatedItems: 0
      })
    }
  })

  return {
    executeUpdate: (itemId: number) => updateMutation.mutate(itemId),
    isUpdating: updateMutation.isPending,
    executionResult
  }
}