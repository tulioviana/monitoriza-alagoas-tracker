import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Activity, Shield, Database, AlertTriangle, BarChart3 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AdminControlCenter } from './AdminControlCenter'
import { AdminUserManagement } from './AdminUserManagement'
import { AdminSystemLogs } from './AdminSystemLogs'
import { AdminSystemStats } from './AdminSystemStats'

export function AdminPanel() {
  const [activeSection, setActiveSection] = useState('overview')

  const adminSections = [
    {
      id: 'overview',
      label: 'Visão Geral',
      icon: BarChart3,
      description: 'Estatísticas gerais do sistema'
    },
    {
      id: 'control',
      label: 'Centro de Controle',
      icon: Shield,
      description: 'Sincronização e controles do sistema'
    },
    {
      id: 'users',
      label: 'Gestão de Usuários',
      icon: Users,
      description: 'Gerenciar usuários e permissões'
    },
    {
      id: 'logs',
      label: 'Logs do Sistema',
      icon: Activity,
      description: 'Auditoria e logs de atividades'
    }
  ]

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'overview':
        return <AdminSystemStats />
      case 'control':
        return <AdminControlCenter />
      case 'users':
        return <AdminUserManagement />
      case 'logs':
        return <AdminSystemLogs />
      default:
        return <AdminSystemStats />
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Shield className="w-6 h-6 text-destructive" />
        <h1 className="text-2xl font-bold">Painel Administrativo</h1>
      </div>

      <Tabs value={activeSection} onValueChange={setActiveSection}>
        <TabsList className="grid w-full grid-cols-4">
          {adminSections.map((section) => {
            const Icon = section.icon
            return (
              <TabsTrigger key={section.id} value={section.id} className="flex items-center gap-2">
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{section.label}</span>
              </TabsTrigger>
            )
          })}
        </TabsList>

        {adminSections.map((section) => (
          <TabsContent key={section.id} value={section.id} className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <section.icon className="w-5 h-5" />
                  {section.label}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {section.description}
                </p>
              </CardHeader>
              <CardContent>
                {renderSectionContent()}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}