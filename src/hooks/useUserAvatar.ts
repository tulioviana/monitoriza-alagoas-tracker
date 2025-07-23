
import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'

export function useUserAvatar() {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      // Load avatar from profiles table
      const loadAvatar = async () => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('avatar_url')
          .eq('id', user.id)
          .single()
        
        if (profile?.avatar_url) {
          setAvatarUrl(profile.avatar_url)
        }
      }
      
      loadAvatar()
    }
  }, [user])

  return avatarUrl
}
