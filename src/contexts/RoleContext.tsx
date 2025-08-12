import { createContext, useContext, useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'

type Role = 'admin' | 'user' | null

interface RoleContextType {
  role: Role
  isAdmin: boolean
  isUser: boolean
  loading: boolean
  refreshRole: () => Promise<void>
}

const RoleContext = createContext<RoleContextType | undefined>(undefined)

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<Role>(null)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  const fetchUserRole = async () => {
    if (!user?.id) {
      console.log('🔍 RoleContext: No user ID, setting role to null')
      setRole(null)
      setLoading(false)
      return
    }

    console.log('🔍 RoleContext: Fetching role for user:', user.id, user.email)

    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .order('role', { ascending: true }) // admin comes first due to alphabetical order
        .limit(1)
        .single()

      console.log('🔍 RoleContext: Query result:', { data, error })

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('❌ RoleContext: Error fetching user role:', error)
        setRole('user') // Default to user role on error
      } else {
        const userRole = data?.role || 'user'
        console.log('✅ RoleContext: Setting role to:', userRole)
        setRole(userRole)
      }
    } catch (error) {
      console.error('❌ RoleContext: Exception fetching user role:', error)
      setRole('user') // Default to user role on error
    } finally {
      setLoading(false)
    }
  }

  const refreshRole = async () => {
    setLoading(true)
    await fetchUserRole()
  }

  useEffect(() => {
    fetchUserRole()
  }, [user?.id])

  const value = {
    role,
    isAdmin: role === 'admin',
    isUser: role === 'user',
    loading,
    refreshRole,
  }

  console.log('🔍 RoleContext: Current state:', { 
    role, 
    isAdmin: role === 'admin', 
    isUser: role === 'user', 
    loading,
    userId: user?.id,
    userEmail: user?.email 
  })

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>
}

export function useRole() {
  const context = useContext(RoleContext)
  if (context === undefined) {
    throw new Error('useRole must be used within a RoleProvider')
  }
  return context
}