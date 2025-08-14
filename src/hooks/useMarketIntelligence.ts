import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './useAuth'

interface MarketIntelligenceParams {
  period: string
  itemType: string
}

interface MarketIntelligenceData {
  totalEstablishments: number
  newEstablishments: number
  potentialSavings: number
  avgPriceVariation: number
  totalItems: number
  itemTypeDistribution: Array<{
    type: string
    count: number
  }>
  topOpportunities: Array<{
    item: string
    maxPrice: number
    minPrice: number
    savings: number
  }>
}

export function useMarketIntelligence({ period, itemType }: MarketIntelligenceParams) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['market-intelligence', user?.id, period, itemType],
    queryFn: async (): Promise<MarketIntelligenceData> => {
      if (!user?.id) throw new Error('User not authenticated')

      const periodDays = parseInt(period)
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - periodDays)

      // Buscar itens monitorados do usuário
      const { data: trackedItems } = await supabase
        .from('tracked_items')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)

      if (!trackedItems || trackedItems.length === 0) {
        return {
          totalEstablishments: 0,
          newEstablishments: 0,
          potentialSavings: 0,
          avgPriceVariation: 0,
          totalItems: 0,
          itemTypeDistribution: [],
          topOpportunities: []
        }
      }

      // Filtrar por tipo se especificado
      const filteredItems = itemType === 'all' 
        ? trackedItems 
        : trackedItems.filter(item => item.item_type === itemType)

      // Buscar histórico de preços
      const { data: priceHistory } = await supabase
        .from('price_history')
        .select('*')
        .in('tracked_item_id', filteredItems.map(item => item.id))
        .gte('fetch_date', startDate.toISOString())
        .order('fetch_date', { ascending: false })

      // Calcular métricas
      const establishments = new Set(priceHistory?.map(p => p.establishment_cnpj).filter(Boolean))
      const totalEstablishments = establishments.size

      // Distribuição por tipo
      const typeDistribution = filteredItems.reduce((acc, item) => {
        const existing = acc.find(d => d.type === item.item_type)
        if (existing) {
          existing.count++
        } else {
          acc.push({ type: item.item_type, count: 1 })
        }
        return acc
      }, [] as Array<{ type: string, count: number }>)

      // Calcular economia potencial (diferença entre maior e menor preço por item)
      const savingsByItem = filteredItems.map(item => {
        const itemPrices = priceHistory?.filter(p => p.tracked_item_id === item.id) || []
        if (itemPrices.length === 0) return 0

        const prices = itemPrices.map(p => parseFloat(p.sale_price.toString()))
        const maxPrice = Math.max(...prices)
        const minPrice = Math.min(...prices)
        return maxPrice - minPrice
      })

      const potentialSavings = savingsByItem.reduce((sum, saving) => sum + saving, 0)

      // Calcular variação média de preços
      let totalVariation = 0
      let itemsWithVariation = 0

      filteredItems.forEach(item => {
        const itemPrices = priceHistory?.filter(p => p.tracked_item_id === item.id) || []
        if (itemPrices.length >= 2) {
          const sortedPrices = itemPrices.sort((a, b) => 
            new Date(a.fetch_date).getTime() - new Date(b.fetch_date).getTime()
          )
          const oldestPrice = parseFloat(sortedPrices[0].sale_price.toString())
          const newestPrice = parseFloat(sortedPrices[sortedPrices.length - 1].sale_price.toString())
          
          if (oldestPrice > 0) {
            const variation = ((newestPrice - oldestPrice) / oldestPrice) * 100
            totalVariation += variation
            itemsWithVariation++
          }
        }
      })

      const avgPriceVariation = itemsWithVariation > 0 ? totalVariation / itemsWithVariation : 0

      // Top oportunidades (items com maior diferença de preço)
      const topOpportunities = filteredItems
        .map(item => {
          const itemPrices = priceHistory?.filter(p => p.tracked_item_id === item.id) || []
          if (itemPrices.length === 0) return null

          const prices = itemPrices.map(p => parseFloat(p.sale_price.toString()))
          const maxPrice = Math.max(...prices)
          const minPrice = Math.min(...prices)
          const savings = maxPrice - minPrice

          return {
            item: item.nickname,
            maxPrice,
            minPrice,
            savings
          }
        })
        .filter(Boolean)
        .sort((a, b) => (b?.savings || 0) - (a?.savings || 0))
        .slice(0, 5)

      return {
        totalEstablishments,
        newEstablishments: Math.floor(totalEstablishments * 0.1), // Simulado
        potentialSavings,
        avgPriceVariation,
        totalItems: filteredItems.length,
        itemTypeDistribution: typeDistribution,
        topOpportunities: topOpportunities as any
      }
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutos
  })
}