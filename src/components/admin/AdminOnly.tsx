import { useRole } from '@/contexts/RoleContext'
import { ReactNode } from 'react'

interface AdminOnlyProps {
  children: ReactNode
  fallback?: ReactNode
}

export function AdminOnly({ children, fallback = null }: AdminOnlyProps) {
  const { isAdmin, loading } = useRole()

  if (loading) {
    return null
  }

  if (!isAdmin) {
    return <>{fallback}</>
  }

  return <>{children}</>
}