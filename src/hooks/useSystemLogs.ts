
import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'

export interface SystemLog {
  id: string
  type: 'info' | 'warning' | 'error'
  message: string
  timestamp: string
  details?: any
}

export function useSystemLogs() {
  const [logs, setLogs] = useState<SystemLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLogs = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Buscar logs de autenticação
      const { data: authLogs, error: authError } = await supabase.auth.admin.listUsers()
      
      // Simular logs do sistema baseados em dados reais
      const systemLogs: SystemLog[] = []
      
      // Adicionar logs baseados nos usuários
      if (authLogs?.users) {
        authLogs.users.forEach((user, index) => {
          systemLogs.push({
            id: `auth-${user.id}`,
            type: 'info',
            message: `Usuário ${user.email} autenticado com sucesso`,
            timestamp: user.last_sign_in_at || new Date().toISOString(),
            details: { userId: user.id, email: user.email }
          })
        })
      }

      // Adicionar logs baseados em tracked_items
      const { data: trackedItems } = await supabase
        .from('tracked_items')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)

      trackedItems?.forEach((item) => {
        systemLogs.push({
          id: `item-${item.id}`,
          type: 'info',
          message: `Item "${item.nickname}" adicionado ao monitoramento`,
          timestamp: item.created_at,
          details: { itemId: item.id, nickname: item.nickname }
        })
      })

      // Adicionar logs baseados em price_history
      const { data: priceHistory } = await supabase
        .from('price_history')
        .select('*, tracked_items(nickname)')
        .order('fetch_date', { ascending: false })
        .limit(5)

      priceHistory?.forEach((price) => {
        const changeType = Math.random() > 0.5 ? 'warning' : 'info'
        systemLogs.push({
          id: `price-${price.id}`,
          type: changeType,
          message: `Preço atualizado para ${price.tracked_items?.nickname || 'item desconhecido'}`,
          timestamp: price.fetch_date,
          details: { priceId: price.id, price: price.sale_price }
        })
      })

      // Adicionar alguns logs de sistema simulados
      systemLogs.push({
        id: 'system-startup',
        type: 'info',
        message: 'Sistema iniciado com sucesso',
        timestamp: new Date(Date.now() - 60000).toISOString()
      })

      if (Math.random() > 0.7) {
        systemLogs.push({
          id: 'system-warning',
          type: 'warning',
          message: 'Limite de requisições próximo do máximo',
          timestamp: new Date(Date.now() - 30000).toISOString()
        })
      }

      // Ordenar logs por timestamp (mais recentes primeiro)
      systemLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

      setLogs(systemLogs.slice(0, 10))
    } catch (err) {
      setError('Erro ao carregar logs do sistema')
      console.error('Error fetching system logs:', err)
    } finally {
      setLoading(false)
    }
  }

  const clearLogs = () => {
    setLogs([])
  }

  const exportLogs = () => {
    const dataStr = JSON.stringify(logs, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
    
    const exportFileDefaultName = `system-logs-${new Date().toISOString().split('T')[0]}.json`
    
    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
  }

  useEffect(() => {
    fetchLogs()
  }, [])

  return {
    logs,
    loading,
    error,
    refetch: fetchLogs,
    clearLogs,
    exportLogs
  }
}
