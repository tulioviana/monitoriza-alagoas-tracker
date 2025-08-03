import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

interface SyncStatus {
  id?: string
  status: 'idle' | 'running' | 'completed' | 'error'
  progress: number
  total_items: number
  current_item?: string
  started_at?: string
  completed_at?: string
  error_message?: string
  updated_at?: string
}

export function useSyncStatus() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    status: 'idle',
    progress: 0,
    total_items: 0
  })
  const [isPolling, setIsPolling] = useState(false)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const { toast } = useToast()

  const startPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
    }
    
    setIsPolling(true)
    
    pollIntervalRef.current = setInterval(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data, error } = await supabase
          .rpc('get_user_sync_status', { p_user_id: user.id })

        if (error) {
          console.error('Erro ao buscar status:', error)
          return
        }

        const status = data as unknown as SyncStatus
        setSyncStatus(status)

        // Parar polling se sync completou ou erro
        if (status.status === 'completed' || status.status === 'error') {
          stopPolling()
          
          if (status.status === 'completed') {
            toast({
              title: "Sincronização Concluída",
              description: "Todos os preços foram atualizados com sucesso!",
            })
          } else if (status.status === 'error') {
            toast({
              variant: "destructive",
              title: "Erro na Sincronização",
              description: status.error_message || "Erro desconhecido na sincronização",
            })
          }
        }
      } catch (error) {
        console.error('Erro no polling:', error)
      }
    }, 2000) // Poll a cada 2 segundos
  }

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
    setIsPolling(false)
  }

  const startSync = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('Usuário não autenticado')
      }

      const { data, error } = await supabase
        .rpc('force_user_sync', { p_user_id: user.id })

      if (error) {
        throw error
      }

      if (data?.includes('ASYNC_STARTED')) {
        startPolling()
        toast({
          title: "Sincronização Iniciada",
          description: "A atualização dos preços foi iniciada. Acompanhe o progresso aqui.",
        })
      } else {
        throw new Error('Resposta inesperada do servidor')
      }
    } catch (error) {
      console.error('Erro ao iniciar sync:', error)
      toast({
        variant: "destructive",
        title: "Erro ao Iniciar Sincronização",
        description: error instanceof Error ? error.message : "Erro desconhecido",
      })
    }
  }

  // Cleanup no unmount
  useEffect(() => {
    return () => {
      stopPolling()
    }
  }, [])

  // Verificar status inicial ao montar
  useEffect(() => {
    const checkInitialStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data, error } = await supabase
          .rpc('get_user_sync_status', { p_user_id: user.id })

        if (!error && data) {
          const status = data as unknown as SyncStatus
          setSyncStatus(status)
          
          // Se há um sync rodando, iniciar polling
          if (status.status === 'running') {
            startPolling()
          }
        }
      } catch (error) {
        console.error('Erro ao verificar status inicial:', error)
      }
    }

    checkInitialStatus()
  }, [])

  return {
    syncStatus,
    isPolling,
    startSync,
    stopPolling
  }
}