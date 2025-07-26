import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

export interface SystemSettings {
  auto_update_enabled: boolean
  update_frequency: string
}

export function useSystemSettings() {
  const [settings, setSettings] = useState<SystemSettings>({
    auto_update_enabled: true,
    update_frequency: '5m'
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  // Carregar configurações do usuário
  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      if (data) {
        setSettings({
          auto_update_enabled: data.auto_update_enabled,
          update_frequency: data.update_frequency
        })
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar as configurações",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // Salvar configurações
  const saveSettings = async (newSettings: SystemSettings) => {
    setSaving(true)
    try {
      // Obter usuário uma única vez
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError) {
        console.error('Erro de autenticação:', userError)
        throw new Error('Falha na autenticação. Faça login novamente.')
      }

      if (!user?.id) {
        throw new Error('Usuário não encontrado. Faça login novamente.')
      }

      // Salvar/atualizar configurações no banco
      const { error: settingsError } = await supabase
        .from('system_settings')
        .upsert({
          auto_update_enabled: newSettings.auto_update_enabled,
          update_frequency: newSettings.update_frequency,
          user_id: user.id
        })

      if (settingsError) {
        console.error('Erro ao salvar configurações:', settingsError)
        throw settingsError
      }

      // Atualizar cron job com nova frequência
      const { error: cronError } = await supabase
        .rpc('update_monitoring_cron_job', {
          p_user_id: user.id,
          p_enabled: newSettings.auto_update_enabled,
          p_frequency: newSettings.update_frequency
        })

      if (cronError) {
        console.error('Erro ao atualizar cron job:', cronError)
        throw cronError
      }

      setSettings(newSettings)
      
      toast({
        title: "Sucesso",
        description: "Configurações salvas com sucesso",
        variant: "default"
      })

      return true
    } catch (error: any) {
      console.error('Erro ao salvar configurações:', error)
      
      let errorMessage = "Não foi possível salvar as configurações"
      
      if (error.message?.includes('autenticação') || error.message?.includes('login')) {
        errorMessage = "Sessão expirada. Faça login novamente."
      } else if (error.code === 'PGRST301') {
        errorMessage = "Erro de permissão. Verifique suas credenciais."
      } else if (error.message) {
        errorMessage = error.message
      }
      
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive"
      })
      return false
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    loadSettings()
  }, [])

  return {
    settings,
    loading,
    saving,
    saveSettings,
    refreshSettings: loadSettings
  }
}