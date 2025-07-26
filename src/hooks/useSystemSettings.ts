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
    if (!user) {
      toast.error('Usuário não autenticado')
      return
    }

    // Validate frequency values
    const validFrequencies = ['5m', '30m', '1h', '6h', '12h', '24h']
    if (!validFrequencies.includes(newSettings.update_frequency)) {
      toast.error('Frequência de atualização inválida')
      return
    }

    setSaving(true)
    try {
      // Try upsert with explicit onConflict handling
      const { error: upsertError } = await supabase
        .from('system_settings')
        .upsert({
          user_id: user.id,
          ...newSettings
        }, {
          onConflict: 'user_id',
          ignoreDuplicates: false
        })

      if (upsertError) {
        // If upsert fails, try update first, then insert if needed
        console.warn('Upsert failed, trying update:', upsertError)
        
        const { error: updateError } = await supabase
          .from('system_settings')
          .update(newSettings)
          .eq('user_id', user.id)

        if (updateError) {
          // If update fails, the record doesn't exist, so insert
          console.warn('Update failed, trying insert:', updateError)
          
          const { error: insertError } = await supabase
            .from('system_settings')
            .insert({
              user_id: user.id,
              ...newSettings
            })

          if (insertError) {
            throw insertError
          }
        }
      }

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
    } catch (error: any) {
      console.error('Error saving system settings:', error)
      
      // Provide specific error messages
      if (error?.message?.includes('duplicate key')) {
        toast.error('Erro de conflito de dados. Recarregue a página e tente novamente.')
      } else if (error?.message?.includes('violates row-level security')) {
        toast.error('Erro de permissão. Verifique se você está logado.')
      } else {
        toast.error('Erro ao salvar configurações: ' + (error?.message || 'Erro desconhecido'))
      }
      
      // Reload settings to ensure state consistency
      await loadSettings()
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