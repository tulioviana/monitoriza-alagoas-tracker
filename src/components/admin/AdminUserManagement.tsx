import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Users, Crown, User, MoreVertical, Eye, UserX, UserCheck } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useState } from 'react'
import { toast } from 'sonner'

interface UserWithRole {
  id: string
  full_name: string
  app_name: string | null
  avatar_url: string | null
  created_at: string
  role: 'admin' | 'user' | null
  tracked_items_count: number
}

export function AdminUserManagement() {
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const { data: users, refetch, isLoading } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: async () => {
      // Get users with their roles and tracked items count
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          app_name,
          avatar_url,
          created_at
        `)
        .order('created_at', { ascending: false })

      if (usersError) throw usersError

      // Get roles for all users
      const userIds = usersData.map(user => user.id)
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', userIds)

      // Get tracked items count for each user
      const { data: trackedItemsData } = await supabase
        .from('tracked_items')
        .select('user_id')
        .in('user_id', userIds)

      // Combine the data
      const usersWithRoles: UserWithRole[] = usersData.map(user => {
        const userRole = rolesData?.find(role => role.user_id === user.id)
        const trackedItemsCount = trackedItemsData?.filter(item => item.user_id === user.id).length || 0
        
        return {
          ...user,
          role: userRole?.role || 'user',
          tracked_items_count: trackedItemsCount
        }
      })

      return usersWithRoles
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  })

  const handleToggleRole = async (userId: string, currentRole: 'admin' | 'user' | null) => {
    setActionLoading(userId)
    try {
      const newRole = currentRole === 'admin' ? 'user' : 'admin'
      
      // Delete existing role
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)

      // Insert new role
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: newRole })

      if (error) throw error

      toast.success(`Usuário ${newRole === 'admin' ? 'promovido a administrador' : 'rebaixado a usuário comum'}`)
      refetch()
    } catch (error) {
      console.error('Error updating user role:', error)
      toast.error('Erro ao alterar permissões do usuário')
    } finally {
      setActionLoading(null)
    }
  }

  const getUserInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const getRoleBadge = (role: 'admin' | 'user' | null) => {
    switch (role) {
      case 'admin':
        return (
          <Badge variant="error" className="flex items-center gap-1">
            <Crown className="w-3 h-3" />
            Admin
          </Badge>
        )
      case 'user':
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <User className="w-3 h-3" />
            Usuário
          </Badge>
        )
      default:
        return (
          <Badge variant="outline">
            Indefinido
          </Badge>
        )
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          <h3 className="text-lg font-medium">Gestão de Usuários</h3>
        </div>
        <Badge variant="outline">
          {users?.length || 0} usuários
        </Badge>
      </div>

      <div className="space-y-3">
        {users && users.length > 0 ? (
          users.map((user) => (
            <Card key={user.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                      {getUserInitials(user.full_name)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{user.full_name}</p>
                        {getRoleBadge(user.role)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {user.tracked_items_count} itens monitorados
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Cadastrado em {new Date(user.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" disabled={actionLoading === user.id}>
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleToggleRole(user.id, user.role)}>
                        {user.role === 'admin' ? (
                          <>
                            <UserX className="w-4 h-4 mr-2" />
                            Remover Admin
                          </>
                        ) : (
                          <>
                            <UserCheck className="w-4 h-4 mr-2" />
                            Tornar Admin
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Eye className="w-4 h-4 mr-2" />
                        Ver Detalhes
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="w-8 h-8 mx-auto mb-2" />
            <p>Nenhum usuário encontrado</p>
          </div>
        )}
      </div>
    </div>
  )
}