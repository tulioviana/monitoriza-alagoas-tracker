
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

export interface DashboardStats {
  activeItems: number
  pausedItems: number
  totalItems: number
  lastUpdateTime: string | null
  itemsWithIssues: number
  alertsActive: number
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async (): Promise<DashboardStats> => {
      // Get tracked items stats
      const { data: trackedItems } = await supabase
        .from('tracked_items')
        .select('*')

      const activeItems = trackedItems?.filter(item => item.is_active).length || 0
      const pausedItems = trackedItems?.filter(item => !item.is_active).length || 0
      const totalItems = trackedItems?.length || 0

      // Get last update time from price_history
      const { data: lastUpdate } = await supabase
        .from('price_history')
        .select('fetch_date')
        .order('fetch_date', { ascending: false })
        .limit(1)

      const lastUpdateTime = lastUpdate?.[0]?.fetch_date || null

      // Get items with issues (no updates in last 24 hours)
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      
      const { data: itemsWithRecentUpdates } = await supabase
        .from('price_history')
        .select('tracked_item_id')
        .gte('fetch_date', twentyFourHoursAgo)

      const itemsWithUpdates = new Set(itemsWithRecentUpdates?.map(item => item.tracked_item_id) || [])
      const itemsWithIssues = activeItems - itemsWithUpdates.size

      return {
        activeItems,
        pausedItems,
        totalItems,
        lastUpdateTime,
        itemsWithIssues: Math.max(0, itemsWithIssues),
        alertsActive: itemsWithIssues > 0 ? 1 : 0 // Simple alert logic
      }
    }
  })
}
