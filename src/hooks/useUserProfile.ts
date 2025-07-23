import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'

interface UserProfile {
  full_name: string | null
  app_name: string | null
  avatar_url: string | null
}

export function useUserProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      loadProfile()
      
      // Listen for real-time updates to the profile
      const subscription = supabase
        .channel('profile_changes')
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'profiles',
            filter: `id=eq.${user.id}`
          }, 
          () => {
            loadProfile()
          }
        )
        .subscribe()

      return () => {
        subscription.unsubscribe()
      }
    } else {
      setProfile(null)
      setLoading(false)
    }
  }, [user])

  const loadProfile = async () => {
    if (!user) return
    
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, app_name, avatar_url')
        .eq('id', user.id)
        .single()
      
      setProfile(profile)
    } catch (error) {
      console.error('Error loading profile:', error)
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }

  return {
    profile,
    loading,
    refresh: loadProfile
  }
}