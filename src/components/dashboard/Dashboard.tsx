
import { useState } from 'react'
import { Sidebar } from './Sidebar'
import { DashboardHeader } from './DashboardHeader'
import { MonitoringStatus } from './MonitoringStatus'
import { QuickActions } from './QuickActions'
import { NewRecentActivity } from './NewRecentActivity'
import { ProductSearch } from './ProductSearch'
import { FuelSearch } from './FuelSearch'
import { TrackedItems } from './TrackedItems'
import { CompetitorSearch } from './CompetitorSearch'
import { SettingsView } from './SettingsView'
import { HistoryView } from './HistoryView'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart3, Bell, History, Settings } from 'lucide-react'

export function Dashboard() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [settingsSection, setSettingsSection] = useState<string | undefined>()

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            <MonitoringStatus />
            <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
                <QuickActions onTabChange={(tab) => {
                  if (tab.includes(':')) {
                    const [mainTab, section] = tab.split(':')
                    setActiveTab(mainTab)
                    setSettingsSection(section)
                  } else {
                    setActiveTab(tab)
                    setSettingsSection(undefined)
                  }
                }} />
              </div>
              <div>
                <NewRecentActivity />
              </div>
            </div>
          </div>
        )
      case 'products':
        return <ProductSearch />
      case 'fuels':
        return <FuelSearch />
      case 'tracked':
        return <TrackedItems onNavigateToTab={(tab) => {
          setActiveTab(tab)
          setSettingsSection(undefined)
        }} />
      case 'competitors':
        return <CompetitorSearch />
      case 'analytics':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Análises e Relatórios
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Em Desenvolvimento</h3>
                <p className="text-muted-foreground">
                  Funcionalidade de análises avançadas em breve
                </p>
              </div>
            </CardContent>
          </Card>
        )
      case 'history':
        return <HistoryView />
      case 'notifications':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Configurar Notificações
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Bell className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Em Desenvolvimento</h3>
                <p className="text-muted-foreground">
                  Configure alertas e notificações personalizadas
                </p>
              </div>
            </CardContent>
          </Card>
        )
      case 'settings':
        return <SettingsView initialSection={settingsSection} />
      default:
        return <div>Página não encontrada</div>
    }
  }

  const getTabTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return 'Dashboard'
      case 'products':
        return 'Busca de Produtos'
      case 'fuels':
        return 'Busca de Combustíveis'
      case 'tracked':
        return 'Itens Monitorados'
      case 'competitors':
        return 'Análise de Concorrentes'
      case 'analytics':
        return 'Análises e Relatórios'
      case 'history':
        return 'Histórico de Atividades'
      case 'notifications':
        return 'Notificações'
      case 'settings':
        return 'Configurações'
      default:
        return 'Monitoriza Alagoas'
    }
  }

  const getTabSubtitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return 'Visão geral do monitoramento de preços'
      case 'products':
        return 'Encontre e compare preços de produtos'
      case 'fuels':
        return 'Monitore preços de combustíveis em tempo real'
      case 'tracked':
        return 'Gerencie seus itens em monitoramento'
      case 'competitors':
        return 'Análise competitiva de preços'
      case 'settings':
        return 'Configurações do sistema'
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <DashboardHeader 
          title={getTabTitle()} 
          subtitle={getTabSubtitle()}
        />
        
        <main className="flex-1 overflow-auto p-6">
          {renderTabContent()}
        </main>
      </div>
    </div>
  )
}
