
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { SettingsCard } from './SettingsCard'

export function NotificationSettings() {
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [pushNotifications, setPushNotifications] = useState(true)
  const [priceDropThreshold, setPriceDropThreshold] = useState([5])
  const [priceIncreaseThreshold, setPriceIncreaseThreshold] = useState([10])

  const handleSave = () => {
    console.log('Salvando configurações de alertas...')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Configurações de Alertas</h1>
        <p className="text-muted-foreground">Configure como e quando receber alertas</p>
      </div>

      <SettingsCard
        title="Canais de Notificação"
        description="Escolha como deseja receber os alertas"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="email-notifications">Alertas por Email</Label>
            <Switch
              id="email-notifications"
              checked={emailNotifications}
              onCheckedChange={setEmailNotifications}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="push-notifications">Alertas Push</Label>
            <Switch
              id="push-notifications"
              checked={pushNotifications}
              onCheckedChange={setPushNotifications}
            />
          </div>
        </div>
      </SettingsCard>

      <SettingsCard
        title="Alertas de Preço"
        description="Configure quando ser notificado sobre mudanças de preços"
      >
        <div className="space-y-6">
          <div>
            <Label>Alertar quando preço cair mais de: {priceDropThreshold[0]}%</Label>
            <div className="mt-2">
              <Slider
                value={priceDropThreshold}
                onValueChange={setPriceDropThreshold}
                max={50}
                min={1}
                step={1}
                className="w-full"
              />
            </div>
          </div>

          <div>
            <Label>Alertar quando preço subir mais de: {priceIncreaseThreshold[0]}%</Label>
            <div className="mt-2">
              <Slider
                value={priceIncreaseThreshold}
                onValueChange={setPriceIncreaseThreshold}
                max={50}
                min={1}
                step={1}
                className="w-full"
              />
            </div>
          </div>
        </div>
      </SettingsCard>

      <div className="flex justify-end gap-2">
        <Button variant="outline">Cancelar</Button>
        <Button onClick={handleSave}>Salvar Alterações</Button>
      </div>
    </div>
  )
}
