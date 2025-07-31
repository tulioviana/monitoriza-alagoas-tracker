
import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { DashboardStats } from './DashboardStats'
import { TrackedItems } from './TrackedItems'
import { NewRecentActivity } from './NewRecentActivity'
import { QuickActions } from './QuickActions'
import { ProductSearch } from './ProductSearch'
import { FuelSearch } from './FuelSearch'
import { HistoryView } from './HistoryView'
import { CompetitorIntelligence } from './CompetitorIntelligence'
import { SystemMonitoring } from './SystemMonitoring'
import { SettingsView } from './SettingsView'

export function Dashboard() {
  const [currentTab, setCurrentTab] = useState('overview')
  const { user } = useAuth()

  const renderContent = () => {
    switch (currentTab) {
      case 'overview':
        return (
          <div className="grid gap-6 lg:grid-cols-4">
            <div className="lg:col-span-3 space-y-6">
              <DashboardStats />
              <TrackedItems onNavigateToTab={setCurrentTab} />
            </div>
            <div className="space-y-6">
              <NewRecentActivity onTabChange={setCurrentTab} />
              <QuickActions onTabChange={setCurrentTab} />
            </div>
          </div>
        )
      case 'tracked':
        return <TrackedItems onNavigateToTab={setCurrentTab} />
      case 'product-search':
        return <ProductSearch />
      case 'fuel-search':
        return <FuelSearch />
      case 'history':
        return <HistoryView />
      case 'competitor':
        return <CompetitorIntelligence />
      case 'system':
        return <SystemMonitoring />
      case 'settings':
        return <SettingsView />
      default:
        return <div>Página não encontrada</div>
    }
  }

  return (
    <>
      {renderContent()}
    </>
  )
}
