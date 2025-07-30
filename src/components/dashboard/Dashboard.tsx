
import { useState } from 'react'
import { DashboardStats } from './DashboardStats'
import { TrackedItems } from './TrackedItems'
import { RecentActivity } from './RecentActivity'
import { QuickActions } from './QuickActions'

export function Dashboard({ onTabChange }: { onTabChange: (tab: string) => void }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">
          Visão geral do monitoramento de preços
        </p>
      </div>

      <DashboardStats />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <TrackedItems />
          <QuickActions onTabChange={onTabChange} />
        </div>
        
        <div className="space-y-6">
          <RecentActivity onTabChange={onTabChange} />
        </div>
      </div>
    </div>
  )
}
