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
      // Salvar/atualizar configurações no banco
      const { error: settingsError } = await supabase
        .from('system_settings')
        .upsert({
          auto_update_enabled: newSettings.auto_update_enabled,
          update_frequency: newSettings.update_frequency,
          user_id: (await supabase.auth.getUser()).data.user?.id
        })

      if (settingsError) throw settingsError

      // Atualizar cron job com nova frequência
      const { error: cronError } = await supabase
        .rpc('update_monitoring_cron_job', {
          p_user_id: (await supabase.auth.getUser()).data.user?.id,
          p_enabled: newSettings.auto_update_enabled,
          p_frequency: newSettings.update_frequency
        })

      if (cronError) throw cronError

      setSettings(newSettings)
      
      toast({
        title: "Sucesso",
        description: "Configurações salvas com sucesso",
        variant: "default"
      })

      return true
    } catch (error) {
      console.error('Erro ao salvar configurações:', error)
      toast({
        title: "Erro",
        description: "Não foi possível salvar as configurações",
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