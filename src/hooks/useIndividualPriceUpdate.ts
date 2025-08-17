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

      console.log('Individual update - Starting for item:', itemId, 'user:', user.id)

      try {
        // Get session for authorization
        const { data: session } = await supabase.auth.getSession()
        if (!session.session?.access_token) {
          throw new Error('Sessão não encontrada')
        }

        // Use direct fetch to ensure proper JSON serialization
        const response = await fetch(`https://zzijiecsvyzaqedatuip.supabase.co/functions/v1/update-tracked-prices`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.session.access_token}`,
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6aWppZWNzdnl6YXFlZGF0dWlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNTY5ODYsImV4cCI6MjA2NzkzMjk4Nn0.QGm_1PVmP6s9mJtchkIGeQ_Hj6cq-6352aKiDBVcdXk',
          },
          body: JSON.stringify({
            user_id: user.id,
            item_id: itemId,
            execution_type: 'individual'
          }),
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error('Individual update - HTTP error:', response.status, errorText)
          throw new Error(`Erro HTTP ${response.status}: ${errorText}`)
        }

        const data = await response.json()
        console.log('Individual update - Success:', data)
        return data
      } catch (error) {
        console.error('Individual update - Error:', error)
        throw error
      }
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