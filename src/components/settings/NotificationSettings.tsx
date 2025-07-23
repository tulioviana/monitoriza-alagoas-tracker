
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Checkbox } from '@/components/ui/checkbox'
import { SettingsCard } from './SettingsCard'

export function NotificationSettings() {
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [pushNotifications, setPushNotifications] = useState(true)
  const [priceDropThreshold, setPriceDropThreshold] = useState([5])
  const [priceIncreaseThreshold, setPriceIncreaseThreshold] = useState([10])
  const [notificationTypes, setNotificationTypes] = useState({
    priceDrops: true,
    priceIncreases: true,
    newProducts: false,
    competitorChanges: true
  })

  const handleSave = () => {
    console.log('Salvando configurações de notificações...')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Configurações de Notificações</h1>
        <p className="text-muted-foreground">Configure como e quando receber alertas</p>
      </div>

      <SettingsCard
        title="Canais de Notificação"
        description="Escolha como deseja receber as notificações"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="email-notifications">Notificações por Email</Label>
            <Switch
              id="email-notifications"
              checked={emailNotifications}
              onCheckedChange={setEmailNotifications}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="push-notifications">Notificações Push</Label>
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

      <SettingsCard
        title="Tipos de Notificação"
        description="Escolha quais tipos de alertas deseja receber"
      >
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="price-drops"
              checked={notificationTypes.priceDrops}
              onCheckedChange={(checked) => 
                setNotificationTypes(prev => ({ ...prev, priceDrops: checked as boolean }))
              }
            />
            <Label htmlFor="price-drops">Quedas de preço</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="price-increases"
              checked={notificationTypes.priceIncreases}
              onCheckedChange={(checked) => 
                setNotificationTypes(prev => ({ ...prev, priceIncreases: checked as boolean }))
              }
            />
            <Label htmlFor="price-increases">Aumentos de preço</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="new-products"
              checked={notificationTypes.newProducts}
              onCheckedChange={(checked) => 
                setNotificationTypes(prev => ({ ...prev, newProducts: checked as boolean }))
              }
            />
            <Label htmlFor="new-products">Novos produtos disponíveis</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="competitor-changes"
              checked={notificationTypes.competitorChanges}
              onCheckedChange={(checked) => 
                setNotificationTypes(prev => ({ ...prev, competitorChanges: checked as boolean }))
              }
            />
            <Label htmlFor="competitor-changes">Mudanças na concorrência</Label>
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
