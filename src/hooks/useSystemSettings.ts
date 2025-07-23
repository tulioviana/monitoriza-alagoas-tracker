import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './useAuth'
import { toast } from 'sonner'

interface SystemSettings {
  auto_update_enabled: boolean
  update_frequency: string
}

const defaultSettings: SystemSettings = {
  auto_update_enabled: true,
  update_frequency: '30m'
}

export function useSystemSettings() {
  const { user } = useAuth()
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (user) {
      loadSettings()
    }
  }, [user])

  const loadSettings = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('auto_update_enabled, update_frequency')
        .eq('user_id', user.id)
        .maybeSingle()

      if (error) throw error

      if (data) {
        setSettings(data)
      } else {
        // Create default settings for new user
        await createDefaultSettings()
      }
    } catch (error) {
      console.error('Error loading system settings:', error)
      toast.error('Erro ao carregar configurações')
    } finally {
      setLoading(false)
    }
  }

  const createDefaultSettings = async () => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('system_settings')
        .insert({
          user_id: user.id,
          ...defaultSettings
        })

      if (error) throw error

      setSettings(defaultSettings)
    } catch (error) {
      console.error('Error creating default settings:', error)
    }
  }

  const saveSettings = async (newSettings: SystemSettings) => {
    if (!user) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          user_id: user.id,
          ...newSettings
        })

      if (error) throw error

      // Call function to update cron job
      const { error: cronError } = await supabase.rpc('update_monitoring_cron_job', {
        p_user_id: user.id,
        p_enabled: newSettings.auto_update_enabled,
        p_frequency: newSettings.update_frequency
      })

      if (cronError) {
        console.error('Error updating cron job:', cronError)
        toast.error('Configurações salvas, mas houve erro ao atualizar o agendamento')
      } else {
        toast.success('Configurações salvas com sucesso')
      }

      setSettings(newSettings)
    } catch (error) {
      console.error('Error saving system settings:', error)
      toast.error('Erro ao salvar configurações')
    } finally {
      setSaving(false)
    }
  }

  return {
    settings,
    loading,
    saving,
    saveSettings
  }
}