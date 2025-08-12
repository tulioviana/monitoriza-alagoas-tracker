import { useState, useRef } from 'react'
import { Sidebar } from './Sidebar'
import { DashboardHeader } from './DashboardHeader'
import { QuickActions } from './QuickActions'
import { ProductSearch } from './ProductSearch'
import { FuelSearch } from './FuelSearch'
import { SearchHistory } from './SearchHistory'
import { TrackedItemsGrid } from './TrackedItemsGrid'
import { SettingsView } from './SettingsView'
import { AdminPanel } from '@/components/admin/AdminPanel'
import { AdminOnly } from '@/components/admin/AdminOnly'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Bell } from 'lucide-react'

export function Dashboard() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [settingsSection, setSettingsSection] = useState<string | undefined>()
  const [pendingSearchCriteria, setPendingSearchCriteria] = useState<any>(null)

  const handleNavigateToSearch = (tabType: 'products' | 'fuels', searchCriteria: any) => {
    setActiveTab(tabType)
    setSettingsSection(undefined)
    setPendingSearchCriteria(searchCriteria)
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-1">
              <div>
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
            </div>
          </div>
        )
      case 'products':
        return <ProductSearch pendingSearchCriteria={pendingSearchCriteria} onSearchCriteriaProcessed={() => setPendingSearchCriteria(null)} />
      case 'fuels':
        return <FuelSearch pendingSearchCriteria={pendingSearchCriteria} onSearchCriteriaProcessed={() => setPendingSearchCriteria(null)} />
      case 'history':
        return <SearchHistory onNavigateToSearch={handleNavigateToSearch} />
      case 'monitored':
        return <TrackedItemsGrid />
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
      case 'admin':
        return (
          <AdminOnly fallback={<div>Acesso negado</div>}>
            <AdminPanel />
          </AdminOnly>
        )
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
      case 'history':
        return 'Histórico de Buscas'
      case 'monitored':
        return 'Itens Monitorados'
      case 'notifications':
        return 'Notificações'
      case 'settings':
        return 'Configurações'
      case 'admin':
        return 'Painel Administrativo'
      default:
        return 'Whisprice AL'
    }
  }

  const getTabSubtitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return 'Sistema de busca de preços SEFAZ-AL'
      case 'products':
        return 'Encontre e compare preços de produtos'
      case 'fuels':
        return 'Monitore preços de combustíveis em tempo real'
      case 'history':
        return 'Suas pesquisas anteriores por produtos e combustíveis'
      case 'monitored':
        return 'Acompanhe a evolução dos preços dos seus itens'
      case 'settings':
        return 'Configurações do sistema'
      case 'admin':
        return 'Controle total do sistema e usuários'
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