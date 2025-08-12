import { Badge } from '@/components/ui/badge'
import { Shield } from 'lucide-react'
import { useRole } from '@/contexts/RoleContext'

export function AdminBadge() {
  const { isAdmin } = useRole()

  if (!isAdmin) return null

  return (
    <Badge variant="error" className="flex items-center gap-1 text-xs">
      <Shield className="w-3 h-3" />
      ADMIN
    </Badge>
  )
}