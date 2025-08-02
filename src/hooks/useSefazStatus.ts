import { useState, useEffect, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'

export type SefazApiStatus = 'operational' | 'slow' | 'unstable' | 'down' | 'unknown'

interface SefazStatusMetrics {
  status: SefazApiStatus
  lastResponseTime: number | null
  averageResponseTime: number | null
  successRate: number | null
  lastChecked: Date | null
  issues: string[]
}

interface ResponseTimeEntry {
  timestamp: number
  responseTime: number
  success: boolean
}

class SefazStatusTracker {
  private responseHistory: ResponseTimeEntry[] = []
  private readonly maxHistorySize = 50
  
  addResponse(responseTime: number, success: boolean): void {
    const entry: ResponseTimeEntry = {
      timestamp: Date.now(),
      responseTime,
      success
    }
    
    this.responseHistory.push(entry)
    
    // Manter apenas os últimos registros
    if (this.responseHistory.length > this.maxHistorySize) {
      this.responseHistory = this.responseHistory.slice(-this.maxHistorySize)
    }
  }
  
  getMetrics(): SefazStatusMetrics {
    if (this.responseHistory.length === 0) {
      return {
        status: 'unknown',
        lastResponseTime: null,
        averageResponseTime: null,
        successRate: null,
        lastChecked: null,
        issues: []
      }
    }
    
    const recentEntries = this.responseHistory.slice(-10) // Últimas 10 requisições
    const lastEntry = this.responseHistory[this.responseHistory.length - 1]
    
    const avgResponseTime = recentEntries.reduce((sum, entry) => sum + entry.responseTime, 0) / recentEntries.length
    const successCount = recentEntries.filter(entry => entry.success).length
    const successRate = (successCount / recentEntries.length) * 100
    
    const issues: string[] = []
    let status: SefazApiStatus = 'operational'
    
    // Análise de status baseada nas métricas
    if (successRate < 50) {
      status = 'down'
      issues.push('Taxa de sucesso muito baixa')
    } else if (successRate < 80) {
      status = 'unstable'
      issues.push('Múltiplas falhas detectadas')
    } else if (avgResponseTime > 60000) { // 60 segundos
      status = 'down'
      issues.push('Tempo de resposta extremamente alto')
    } else if (avgResponseTime > 30000) { // 30 segundos
      status = 'slow'
      issues.push('Tempo de resposta muito lento')
    } else if (avgResponseTime > 10000) { // 10 segundos
      status = 'slow'
      issues.push('Tempo de resposta lento')
    }
    
    return {
      status,
      lastResponseTime: lastEntry.responseTime,
      averageResponseTime: avgResponseTime,
      successRate,
      lastChecked: new Date(lastEntry.timestamp),
      issues
    }
  }
  
  clear(): void {
    this.responseHistory = []
  }
}

// Singleton instance
const statusTracker = new SefazStatusTracker()

export function useSefazStatus() {
  const [metrics, setMetrics] = useState<SefazStatusMetrics>(statusTracker.getMetrics())
  
  // Health check query
  const { data: healthCheck, isLoading } = useQuery({
    queryKey: ['sefaz-health'],
    queryFn: async () => {
      const startTime = Date.now()
      try {
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sefaz-api-proxy`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          }
        })
        
        const responseTime = Date.now() - startTime
        const success = response.ok
        
        statusTracker.addResponse(responseTime, success)
        setMetrics(statusTracker.getMetrics())
        
        return { success, responseTime }
      } catch (error) {
        const responseTime = Date.now() - startTime
        statusTracker.addResponse(responseTime, false)
        setMetrics(statusTracker.getMetrics())
        throw error
      }
    },
    refetchInterval: 2 * 60 * 1000, // A cada 2 minutos
    retry: false
  })
  
  const recordResponse = useCallback((responseTime: number, success: boolean) => {
    statusTracker.addResponse(responseTime, success)
    setMetrics(statusTracker.getMetrics())
  }, [])
  
  const clearHistory = useCallback(() => {
    statusTracker.clear()
    setMetrics(statusTracker.getMetrics())
  }, [])
  
  return {
    metrics,
    recordResponse,
    clearHistory,
    isChecking: isLoading
  }
}