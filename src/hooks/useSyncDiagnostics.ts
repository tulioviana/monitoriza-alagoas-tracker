import { useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

interface DiagnosticsResult {
  user_id: string
  active_items_count: number
  user_settings_exist: boolean
  edge_function_accessible: boolean
  test_request_id?: number
  system_ready: boolean
  diagnosed_at: string
}

export function useSyncDiagnostics() {
  const [isRunning, setIsRunning] = useState(false)
  const [result, setResult] = useState<DiagnosticsResult | null>(null)
  const { toast } = useToast()

  const runDiagnostics = async () => {
    setIsRunning(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('Usuário não autenticado')
      }

      const { data, error } = await supabase
        .rpc('diagnose_sync_system', { p_user_id: user.id })

      if (error) {
        throw error
      }

      const diagnostics = data as unknown as DiagnosticsResult
      setResult(diagnostics)

      if (diagnostics.system_ready) {
        toast({
          title: "Sistema Funcionando",
          description: "Todos os componentes estão operacionais",
        })
      } else {
        let issues = []
        if (diagnostics.active_items_count === 0) {
          issues.push("Nenhum item ativo para monitoramento")
        }
        if (!diagnostics.user_settings_exist) {
          issues.push("Configurações de usuário não encontradas")
        }
        if (!diagnostics.edge_function_accessible) {
          issues.push("Edge Function inacessível")
        }

        toast({
          variant: "destructive",
          title: "Problemas Detectados",
          description: issues.join(", "),
        })
      }

      return diagnostics
    } catch (error) {
      console.error('Erro no diagnóstico:', error)
      toast({
        variant: "destructive",
        title: "Erro no Diagnóstico",
        description: error instanceof Error ? error.message : "Erro desconhecido",
      })
      throw error
    } finally {
      setIsRunning(false)
    }
  }

  return {
    runDiagnostics,
    isRunning,
    result
  }
}