import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

export interface SystemSettings {
  auto_update_enabled: boolean
  update_frequency: string
  search_radius: number
  max_items: number
}

export function useSystemSettings() {
  const [settings, setSettings] = useState<SystemSettings>({
    auto_update_enabled: true,
    update_frequency: '5m',
    search_radius: 10,
    max_items: 50
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  // Carregar configurações do usuário
  const loadSettings = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user?.id) {
        console.log('Usuário não autenticado, usando configurações padrão')
        return
      }

      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      if (data) {
        setSettings({
          auto_update_enabled: data.auto_update_enabled,
          update_frequency: data.update_frequency,
          search_radius: data.search_radius || 10,
          max_items: data.max_items || 50
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

      // Verificar se já existe um registro para este usuário
      const { data: existingSettings } = await supabase
        .from('system_settings')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      let settingsError
      if (existingSettings) {
        // Atualizar registro existente
        const { error } = await supabase
          .from('system_settings')
          .update({
            auto_update_enabled: newSettings.auto_update_enabled,
            update_frequency: newSettings.update_frequency,
            search_radius: newSettings.search_radius,
            max_items: newSettings.max_items
          })
          .eq('user_id', user.id)
        settingsError = error
      } else {
        // Inserir novo registro
        const { error } = await supabase
          .from('system_settings')
          .insert({
            auto_update_enabled: newSettings.auto_update_enabled,
            update_frequency: newSettings.update_frequency,
            search_radius: newSettings.search_radius,
            max_items: newSettings.max_items,
            user_id: user.id
          })
        settingsError = error
      }

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