
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'

export interface DashboardStats {
  activeItems: number
  pausedItems: number
  totalItems: number
  lastUpdateTime: string | null
  itemsWithIssues: number
  alertsActive: number
}

export function useDashboardStats() {
  const { user } = useAuth()
  
  return useQuery({
    queryKey: ['dashboard-stats', user?.id],
    queryFn: async (): Promise<DashboardStats> => {
      // Get tracked items stats
      const { data: trackedItems, error: trackedItemsError } = await supabase
        .from('tracked_items')
        .select('*')

      // Defensive programming: handle potential errors and null data
      if (trackedItemsError) {
        console.error('Error fetching tracked items:', trackedItemsError)
        throw trackedItemsError
      }

      const activeItems = trackedItems?.filter(item => item?.is_active === true)?.length || 0
      const pausedItems = trackedItems?.filter(item => item?.is_active === false)?.length || 0
      const totalItems = trackedItems?.length || 0

      // Get last update time from price_history
      const { data: lastUpdate, error: lastUpdateError } = await supabase
        .from('price_history')
        .select('fetch_date')
        .order('fetch_date', { ascending: false })
        .limit(1)

      if (lastUpdateError) {
        console.error('Error fetching last update:', lastUpdateError)
      }

      const lastUpdateTime = lastUpdate?.[0]?.fetch_date || null

      // Get items with issues (no updates in last 24 hours)
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      
      const { data: itemsWithRecentUpdates, error: recentUpdatesError } = await supabase
        .from('price_history')
        .select('tracked_item_id')
        .gte('fetch_date', twentyFourHoursAgo)

      if (recentUpdatesError) {
        console.error('Error fetching recent updates:', recentUpdatesError)
      }

      const itemsWithUpdates = new Set(
        itemsWithRecentUpdates?.map(item => item?.tracked_item_id)?.filter(Boolean) || []
      )
      const itemsWithIssues = Math.max(0, activeItems - itemsWithUpdates.size)

      return {
        activeItems,
        pausedItems,
        totalItems,
        lastUpdateTime,
        itemsWithIssues,
        alertsActive: itemsWithIssues > 0 ? 1 : 0
      }
    },
    enabled: !!user // Only run query when user is authenticated
  })
}
