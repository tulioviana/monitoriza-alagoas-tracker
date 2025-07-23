
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

export interface ActivityItem {
  id: string
  type: 'price_update' | 'item_added' | 'item_paused' | 'item_resumed' | 'issue_detected'
  title: string
  description: string
  timestamp: string
  metadata?: {
    oldPrice?: number
    newPrice?: number
    change?: number
    itemName?: string
    establishment?: string
  }
}

export function useRecentActivity(limit?: number) {
  return useQuery({
    queryKey: ['recent-activity', limit],
    queryFn: async (): Promise<ActivityItem[]> => {
      const activities: ActivityItem[] = []

      // Get recent price updates
      const { data: recentPrices } = await supabase
        .from('price_history')
        .select(`
          *,
          tracked_items!inner(nickname),
          establishments!inner(nome_fantasia, razao_social)
        `)
        .order('fetch_date', { ascending: false })
        .limit(10)

      // Convert price updates to activities
      recentPrices?.forEach((price) => {
        activities.push({
          id: `price-${price.id}`,
          type: 'price_update',
          title: `Preço atualizado - ${price.tracked_items.nickname}`,
          description: `${price.establishments.nome_fantasia || price.establishments.razao_social}`,
          timestamp: price.fetch_date,
          metadata: {
            newPrice: price.sale_price,
            itemName: price.tracked_items.nickname,
            establishment: price.establishments.nome_fantasia || price.establishments.razao_social
          }
        })
      })

      // Get recently added items
      const { data: recentItems } = await supabase
        .from('tracked_items')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5)

      recentItems?.forEach((item) => {
        activities.push({
          id: `item-${item.id}`,
          type: 'item_added',
          title: `Item adicionado ao monitoramento`,
          description: item.nickname,
          timestamp: item.created_at,
          metadata: {
            itemName: item.nickname
          }
        })
      })

      // Sort all activities by timestamp
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

      // Apply limit if specified
      const finalLimit = limit || 8
      return activities.slice(0, finalLimit)
    }
  })
}
