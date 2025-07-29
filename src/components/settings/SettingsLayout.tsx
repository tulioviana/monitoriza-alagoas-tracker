
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  User, 
  Monitor, 
  Bell, 
  Shield, 
  Palette
} from 'lucide-react'
import { ProfileSettings } from './ProfileSettings'
import { MonitoringSettings } from './MonitoringSettings'
import { NotificationSettings } from './NotificationSettings'
import { SecuritySettings } from './SecuritySettings'
import { AdvancedSettings } from './AdvancedSettings'

interface SettingsSection {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  component: React.ComponentType
}

const settingsSections: SettingsSection[] = [
  {
    id: 'profile',
    label: 'Perfil',
    icon: User,
    component: ProfileSettings
  },
  {
    id: 'monitoring',
    label: 'Monitoramento',
    icon: Monitor,
    component: MonitoringSettings
  },
  {
    id: 'notifications',
    label: 'Alertas',
    icon: Bell,
    component: NotificationSettings
  },
  {
    id: 'security',
    label: 'Segurança',
    icon: Shield,
    component: SecuritySettings
  },
  {
    id: 'advanced',
    label: 'Aparência',
    icon: Palette,
    component: AdvancedSettings
  }
]

interface SettingsLayoutProps {
  initialSection?: string
}

export function SettingsLayout({ initialSection }: SettingsLayoutProps) {
  const [activeSection, setActiveSection] = useState(initialSection || 'profile')

  const ActiveComponent = settingsSections.find(s => s.id === activeSection)?.component || ProfileSettings

  return (
    <div className="flex h-full gap-6">
      {/* Sidebar */}
      <Card className="w-64 h-fit">
        <CardHeader>
          <CardTitle className="text-lg">Configurações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {settingsSections.map((section) => {
            const Icon = section.icon
            return (
              <Button
                key={section.id}
                variant={activeSection === section.id ? "secondary" : "ghost"}
                className="w-full justify-start gap-3"
                onClick={() => setActiveSection(section.id)}
              >
                <Icon className="w-4 h-4" />
                {section.label}
              </Button>
            )
          })}
        </CardContent>
      </Card>

      {/* Main Content */}
      <div className="flex-1">
        <ActiveComponent />
      </div>
    </div>
  )
}
