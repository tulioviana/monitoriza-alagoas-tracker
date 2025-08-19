
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { SettingsCard } from './SettingsCard'
import { Shield, Smartphone } from 'lucide-react'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'
import { useSettingsContext } from '@/contexts/SettingsContext'
import { toast } from 'sonner'

export function SecuritySettings() {
  const { hasUnsavedChanges, resetChanges } = useSettingsContext()
  
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [initialTwoFactor, setInitialTwoFactor] = useState(false)

  const { markAsChanged, resetChanges: resetUnsavedChanges } = useUnsavedChanges()

  const handleChangePassword = () => {
    if (newPassword !== confirmPassword) {
      toast.error('As senhas não coincidem')
      return
    }
    if (newPassword.length < 6) {
      toast.error('A nova senha deve ter pelo menos 6 caracteres')
      return
    }
    toast.success('Senha alterada com sucesso!')
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
  }

  const handleSave = () => {
    setInitialTwoFactor(twoFactorEnabled)
    resetChanges()
    toast.success('Configurações de segurança salvas!')
  }

  const handleCancel = () => {
    setTwoFactorEnabled(initialTwoFactor)
    resetChanges()
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
              onCheckedChange={(checked) => {
                setTwoFactorEnabled(checked)
                markAsChanged()
              }}
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

      {hasUnsavedChanges && (
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleCancel}>Cancelar</Button>
          <Button onClick={handleSave}>Salvar Alterações</Button>
        </div>
      )}
    </div>
  )
}
