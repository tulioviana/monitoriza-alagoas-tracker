
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { SettingsCard } from './SettingsCard'
import { Shield, Smartphone, Monitor, AlertTriangle } from 'lucide-react'

export function SecuritySettings() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)

  const mockSessions = [
    {
      id: 1,
      device: 'Chrome - Windows',
      location: 'Maceió, AL',
      lastActive: '2 minutos atrás',
      current: true
    },
    {
      id: 2,
      device: 'Safari - iPhone',
      location: 'Maceió, AL',
      lastActive: '1 hora atrás',
      current: false
    }
  ]

  const handleChangePassword = () => {
    console.log('Alterando senha...')
  }

  const handleTerminateSession = (sessionId: number) => {
    console.log(`Terminando sessão ${sessionId}...`)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Configurações de Segurança</h1>
        <p className="text-muted-foreground">Proteja sua conta e dados pessoais</p>
      </div>

      <SettingsCard
        title="Alterar Senha"
        description="Mantenha sua senha segura e atualizada"
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="current-password">Senha Atual</Label>
            <Input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Digite sua senha atual"
            />
          </div>

          <div>
            <Label htmlFor="new-password">Nova Senha</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Digite sua nova senha"
            />
          </div>

          <div>
            <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirme sua nova senha"
            />
          </div>

          <Button onClick={handleChangePassword} className="w-full">
            Alterar Senha
          </Button>
        </div>
      </SettingsCard>

      <SettingsCard
        title="Autenticação em Dois Fatores"
        description="Adicione uma camada extra de segurança à sua conta"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-green-600" />
              <span>Autenticação em Dois Fatores</span>
            </div>
            <Switch
              checked={twoFactorEnabled}
              onCheckedChange={setTwoFactorEnabled}
            />
          </div>

          {twoFactorEnabled && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                Configure seu aplicativo autenticador (Google Authenticator, Authy, etc.)
              </p>
              <Button variant="outline" className="mt-2">
                <Smartphone className="w-4 h-4 mr-2" />
                Configurar Aplicativo
              </Button>
            </div>
          )}
        </div>
      </SettingsCard>

      <SettingsCard
        title="Sessões Ativas"
        description="Gerencie onde sua conta está logada"
      >
        <div className="space-y-4">
          {mockSessions.map((session) => (
            <div key={session.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Monitor className="w-5 h-5 text-muted-foreground" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{session.device}</span>
                    {session.current && <Badge variant="secondary">Atual</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {session.location} • {session.lastActive}
                  </p>
                </div>
              </div>
              {!session.current && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleTerminateSession(session.id)}
                >
                  Terminar
                </Button>
              )}
            </div>
          ))}
        </div>
      </SettingsCard>

      <div className="flex justify-end gap-2">
        <Button variant="outline">Cancelar</Button>
        <Button>Salvar Alterações</Button>
      </div>
    </div>
  )
}
