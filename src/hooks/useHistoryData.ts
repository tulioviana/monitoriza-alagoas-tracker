
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

export interface HistoryItem {
  id: string
  type: 'price_update' | 'item_added' | 'item_paused' | 'item_resumed'
  title: string
  description: string
  timestamp: string
  price?: number
  establishment?: string
  itemName?: string
  saleDate?: string
  fetchDate?: string
}

export function useHistoryData(page: number = 1, limit: number = 20) {
  return useQuery({
    queryKey: ['history-data', page, limit],
    queryFn: async (): Promise<{ items: HistoryItem[]; total: number }> => {
      const offset = (page - 1) * limit
      
      // Get price history with pagination
      const { data: priceHistory, error: priceError, count: priceCount } = await supabase
        .from('price_history')
        .select(`
          *,
          tracked_items!inner(nickname),
          establishments!inner(nome_fantasia, razao_social)
        `, { count: 'exact' })
        .order('fetch_date', { ascending: false })
        .range(offset, offset + limit - 1)

      if (priceError) throw priceError

      // Get tracked items creation history
      const { data: trackedItems, error: itemsError } = await supabase
        .from('tracked_items')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (itemsError) throw itemsError

      const historyItems: HistoryItem[] = []

      // Add price updates
      priceHistory?.forEach((price) => {
        const saleDateTime = new Date(price.sale_date).toLocaleString('pt-BR')
        historyItems.push({
          id: `price-${price.id}`,
          type: 'price_update',
          title: `Preço sincronizado - ${price.tracked_items.nickname}`,
          description: `${price.establishments.nome_fantasia || price.establishments.razao_social} - Transação: ${saleDateTime}`,
          timestamp: price.fetch_date,
          price: price.sale_price,
          establishment: price.establishments.nome_fantasia || price.establishments.razao_social,
          itemName: price.tracked_items.nickname,
          saleDate: price.sale_date,
          fetchDate: price.fetch_date
        })
      })

      // Add tracked items
      trackedItems?.forEach((item) => {
        historyItems.push({
          id: `item-${item.id}`,
          type: 'item_added',
          title: `Item adicionado ao monitoramento`,
          description: item.nickname,
          timestamp: item.created_at,
          itemName: item.nickname
        })
      })

      // Sort all items by timestamp
      historyItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

      return {
        items: historyItems,
        total: priceCount || 0
      }
    }
  })
}
