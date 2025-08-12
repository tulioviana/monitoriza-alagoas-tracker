import { useRole } from '@/contexts/RoleContext'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RefreshCw, Shield, User } from 'lucide-react'

export function RoleDebug() {
  const { user } = useAuth()
  const { role, isAdmin, isUser, loading, refreshRole } = useRole()

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Debug de Roles
        </CardTitle>
        <CardDescription>
          Status atual do sistema de permissões
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Usuário:</span>
            <span className="text-sm font-mono">{user?.email}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">ID:</span>
            <span className="text-xs font-mono">{user?.id}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Role:</span>
            <Badge variant={role === 'admin' ? 'default' : 'secondary'}>
              {loading ? 'Carregando...' : role || 'null'}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">É Admin:</span>
            <Badge variant={isAdmin ? 'default' : 'secondary'}>
              {isAdmin ? 'SIM' : 'NÃO'}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Loading:</span>
            <Badge variant={loading ? 'outline' : 'secondary'}>
              {loading ? 'SIM' : 'NÃO'}
            </Badge>
          </div>
        </div>

        <Button 
          onClick={refreshRole} 
          disabled={loading}
          size="sm"
          className="w-full"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Atualizar Role
        </Button>
        
        <div className="text-xs text-muted-foreground">
          <strong>Problema?</strong> Verifique o console do navegador para logs detalhados.
        </div>
      </CardContent>
    </Card>
  )
}