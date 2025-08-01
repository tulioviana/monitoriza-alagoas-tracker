import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

interface CronJob {
  jobname: string
  schedule: string
  active: boolean
  last_run: string | null
  user_id: string
}

interface SyncLog {
  id: number
  executed_at: string
  execution_type: string
  status: string
  duration_ms: number | null
  error_message: string | null
}

export function useSyncMonitoring() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Buscar informações do cron job do usuário
  const { data: cronJobs = [], isLoading: cronLoading } = useQuery({
    queryKey: ['user-cron-jobs'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.id) throw new Error('Usuário não autenticado')

      const { data, error } = await supabase
        .rpc('get_user_cron_jobs', { p_user_id: user.id })

      if (error) throw error
      return data as CronJob[]
    },
    refetchInterval: 30000, // Atualizar a cada 30 segundos
  })

  // Buscar logs de sincronização do usuário
  const { data: syncLogs = [], isLoading: logsLoading } = useQuery({
    queryKey: ['user-sync-logs'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.id) throw new Error('Usuário não autenticado')

      const { data, error } = await supabase
        .rpc('get_user_sync_logs', { p_user_id: user.id, limit_count: 10 })

      if (error) throw error
      return data as SyncLog[]
    },
    refetchInterval: 15000, // Atualizar a cada 15 segundos
  })

  // Executar sincronização manual
  const syncNow = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.id) throw new Error('Usuário não autenticado')

      const { data, error } = await supabase
        .rpc('execute_user_sync', { p_user_id: user.id })

      if (error) throw error
      return data
    },
    onSuccess: (result) => {
      toast({
        title: "Sincronização iniciada",
        description: "Os preços estão sendo atualizados...",
        variant: "default"
      })
      
      // Recarregar dados após alguns segundos
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['user-sync-logs'] })
        queryClient.invalidateQueries({ queryKey: ['tracked-items'] })
      }, 5000)
    },
    onError: (error: any) => {
      toast({
        title: "Erro na sincronização",
        description: error.message || "Não foi possível executar a sincronização",
        variant: "destructive"
      })
    }
  })

  // Reparar sincronização
  const repairSync = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.id) throw new Error('Usuário não autenticado')

      const { data, error } = await supabase
        .rpc('repair_user_sync', { p_user_id: user.id })

      if (error) throw error
      return data
    },
    onSuccess: (result) => {
      toast({
        title: "Sincronização reparada",
        description: "O sistema de sincronização foi reconfigurado",
        variant: "default"
      })
      
      // Recarregar dados
      queryClient.invalidateQueries({ queryKey: ['user-sync-logs'] })
      queryClient.invalidateQueries({ queryKey: ['user-cron-jobs'] })
      queryClient.invalidateQueries({ queryKey: ['tracked-items'] })
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao reparar",
        description: error.message || "Não foi possível reparar a sincronização",
        variant: "destructive"
      })
    }
  })

  // Calcular status da sincronização
  const syncStatus = (() => {
    if (cronJobs.length === 0) return 'disabled'
    
    const job = cronJobs[0]
    if (!job.active) return 'paused'
    
    const lastLog = syncLogs[0]
    if (!lastLog) return 'pending'
    
    if (lastLog.status === 'SUCCESS') return 'active'
    if (lastLog.status === 'ERROR' || lastLog.status === 'EXECUTION_ERROR') return 'error'
    
    return 'unknown'
  })()

  // Próxima execução estimada
  const nextRun = (() => {
    if (cronJobs.length === 0 || !cronJobs[0].active) return null
    
    const schedule = cronJobs[0].schedule
    const lastRun = cronJobs[0].last_run
    
    if (!lastRun) return 'Em breve'
    
    // Calcular próxima execução baseada no schedule
    const scheduleMap: { [key: string]: number } = {
      '*/5 * * * *': 5,
      '*/30 * * * *': 30,
      '0 * * * *': 60,
      '0 */6 * * *': 360,
      '0 */12 * * *': 720,
      '0 0 * * *': 1440
    }
    
    const intervalMinutes = scheduleMap[schedule] || 30
    const lastRunDate = new Date(lastRun)
    const nextRunDate = new Date(lastRunDate.getTime() + intervalMinutes * 60000)
    
    return nextRunDate.toLocaleString()
  })()

  return {
    cronJobs,
    syncLogs,
    syncStatus,
    nextRun,
    isLoading: cronLoading || logsLoading,
    syncNow: syncNow.mutate,
    isSyncing: syncNow.isPending,
    repairSync: repairSync.mutate,
    isRepairing: repairSync.isPending
  }
}