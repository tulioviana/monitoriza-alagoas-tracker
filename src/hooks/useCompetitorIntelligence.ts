import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

export interface CompetitorProfile {
  establishment_cnpj: string
  establishment_name: string
  total_products: number
  avg_price: number
  min_price: number
  max_price: number
  price_volatility: number
  last_activity: string
  pricing_position: 'low' | 'medium' | 'high'
  consistency_score: number
  market_share: number
}

export interface ProductCompetitiveData {
  product_description: string
  establishment_cnpj: string
  establishment_name: string
  current_price: number
  price_trend: 'up' | 'down' | 'stable'
  position_rank: number
  price_change_30d: number
  last_update: string
}

export interface PriceMovement {
  date: string
  establishment_cnpj: string
  establishment_name: string
  product_description: string
  old_price: number
  new_price: number
  change_percentage: number
  impact: 'high' | 'medium' | 'low'
}

export function useCompetitorIntelligence() {
  return useQuery({
    queryKey: ['competitor-intelligence'],
    queryFn: async () => {
      // Get all establishments that have products being monitored
      const { data: monitoredEstablishments, error: establishmentsError } = await supabase
        .from('price_history')
        .select(`
          establishment_cnpj,
          sale_price,
          sale_date,
          tracked_item_id,
          tracked_items!inner(
            nickname,
            search_criteria,
            user_id
          )
        `)
        .order('sale_date', { ascending: false })

      if (establishmentsError) throw establishmentsError

      // Get establishment details
      const cnpjs = [...new Set(monitoredEstablishments?.map(item => item.establishment_cnpj) || [])]
      const { data: establishments } = await supabase
        .from('establishments')
        .select('*')
        .in('cnpj', cnpjs)

      // Calculate competitor profiles
      const competitorProfiles: CompetitorProfile[] = cnpjs.map(cnpj => {
        const establishment = establishments?.find(est => est.cnpj === cnpj)
        const establishmentData = monitoredEstablishments?.filter(item => item.establishment_cnpj === cnpj) || []
        
        const prices = establishmentData.map(item => item.sale_price)
        const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length
        const minPrice = Math.min(...prices)
        const maxPrice = Math.max(...prices)
        
        // Calculate volatility (standard deviation / mean)
        const variance = prices.reduce((sum, price) => sum + Math.pow(price - avgPrice, 2), 0) / prices.length
        const volatility = Math.sqrt(variance) / avgPrice

        // Calculate pricing position based on average price percentile
        const allPrices = monitoredEstablishments?.map(item => item.sale_price) || []
        const avgPricePercentile = allPrices.filter(price => price <= avgPrice).length / allPrices.length
        
        let pricingPosition: 'low' | 'medium' | 'high' = 'medium'
        if (avgPricePercentile <= 0.33) pricingPosition = 'low'
        else if (avgPricePercentile >= 0.67) pricingPosition = 'high'

        // Calculate consistency score (inverse of volatility, normalized to 0-100)
        const consistencyScore = Math.max(0, Math.min(100, (1 - volatility) * 100))

        // Calculate market share (percentage of total monitored sales)
        const totalProducts = monitoredEstablishments?.length || 1
        const marketShare = (establishmentData.length / totalProducts) * 100

        const lastActivity = establishmentData.length > 0 
          ? Math.max(...establishmentData.map(item => new Date(item.sale_date).getTime()))
          : Date.now()

        return {
          establishment_cnpj: cnpj,
          establishment_name: establishment?.nome_fantasia || establishment?.razao_social || 'Estabelecimento Desconhecido',
          total_products: [...new Set(establishmentData.map(item => item.tracked_item_id))].length,
          avg_price: avgPrice || 0,
          min_price: minPrice || 0,
          max_price: maxPrice || 0,
          price_volatility: volatility || 0,
          last_activity: new Date(lastActivity).toISOString(),
          pricing_position: pricingPosition,
          consistency_score: consistencyScore,
          market_share: marketShare
        }
      })

      return {
        competitorProfiles: competitorProfiles.filter(profile => profile.total_products > 0),
        totalCompetitors: competitorProfiles.length,
        totalMonitoredProducts: [...new Set(monitoredEstablishments?.map(item => item.tracked_item_id))].length
      }
    }
  })
}

export function useProductCompetitiveAnalysis() {
  return useQuery({
    queryKey: ['product-competitive-analysis'],
    queryFn: async () => {
      const { data: priceData, error } = await supabase
        .from('price_history')
        .select(`
          *,
          tracked_items!inner(
            nickname,
            search_criteria,
            user_id
          )
        `)
        .order('sale_date', { ascending: false })
        .limit(1000)

      if (error) throw error

      // Get establishment details
      const cnpjs = [...new Set(priceData?.map(item => item.establishment_cnpj) || [])]
      const { data: establishments } = await supabase
        .from('establishments')
        .select('*')
        .in('cnpj', cnpjs)

      // Group by product and analyze competitive position
      const productGroups = priceData?.reduce((groups, item) => {
        const key = `${item.tracked_item_id}-${item.establishment_cnpj}`
        if (!groups[key]) {
          groups[key] = []
        }
        groups[key].push(item)
        return groups
      }, {} as Record<string, any[]>) || {}

      const competitiveData: ProductCompetitiveData[] = Object.entries(productGroups).map(([key, items]) => {
        const latestItem = items[0] // Already sorted by date desc
        const establishment = establishments?.find(est => est.cnpj === latestItem.establishment_cnpj)
        
        // Calculate trend (compare last 2 prices if available)
        let trend: 'up' | 'down' | 'stable' = 'stable'
        if (items.length > 1) {
          const currentPrice = items[0].sale_price
          const previousPrice = items[1].sale_price
          if (currentPrice > previousPrice) trend = 'up'
          else if (currentPrice < previousPrice) trend = 'down'
        }

        // Calculate 30-day price change
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        const oldPrice = items.find(item => new Date(item.sale_date) <= thirtyDaysAgo)?.sale_price
        const priceChange30d = oldPrice ? ((latestItem.sale_price - oldPrice) / oldPrice) * 100 : 0

        return {
          product_description: latestItem.tracked_items.nickname,
          establishment_cnpj: latestItem.establishment_cnpj,
          establishment_name: establishment?.nome_fantasia || establishment?.razao_social || 'Desconhecido',
          current_price: latestItem.sale_price,
          price_trend: trend,
          position_rank: 1, // Will be calculated after all data is processed
          price_change_30d: priceChange30d,
          last_update: latestItem.sale_date
        }
      })

      return competitiveData
    }
  })
}

export function usePriceMovements(days: number = 7) {
  return useQuery({
    queryKey: ['price-movements', days],
    queryFn: async () => {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      const { data: recentPrices, error } = await supabase
        .from('price_history')
        .select(`
          *,
          tracked_items!inner(
            nickname,
            user_id
          )
        `)
        .gte('sale_date', startDate.toISOString())
        .order('sale_date', { ascending: false })

      if (error) throw error

      // Get establishment details
      const cnpjs = [...new Set(recentPrices?.map(item => item.establishment_cnpj) || [])]
      const { data: establishments } = await supabase
        .from('establishments')
        .select('*')
        .in('cnpj', cnpjs)

      // Detect significant price movements
      const movements: PriceMovement[] = []
      const productGroups = recentPrices?.reduce((groups, item) => {
        const key = `${item.tracked_item_id}-${item.establishment_cnpj}`
        if (!groups[key]) {
          groups[key] = []
        }
        groups[key].push(item)
        return groups
      }, {} as Record<string, any[]>) || {}

      Object.entries(productGroups).forEach(([key, items]) => {
        if (items.length < 2) return

        // Sort by date to get chronological order
        items.sort((a, b) => new Date(a.sale_date).getTime() - new Date(b.sale_date).getTime())

        for (let i = 1; i < items.length; i++) {
          const current = items[i]
          const previous = items[i - 1]
          const changePercentage = ((current.sale_price - previous.sale_price) / previous.sale_price) * 100

          // Only include significant movements (>= 5%)
          if (Math.abs(changePercentage) >= 5) {
            const establishment = establishments?.find(est => est.cnpj === current.establishment_cnpj)
            
            movements.push({
              date: current.sale_date,
              establishment_cnpj: current.establishment_cnpj,
              establishment_name: establishment?.nome_fantasia || establishment?.razao_social || 'Desconhecido',
              product_description: current.tracked_items.nickname,
              old_price: previous.sale_price,
              new_price: current.sale_price,
              change_percentage: changePercentage,
              impact: Math.abs(changePercentage) >= 20 ? 'high' : Math.abs(changePercentage) >= 10 ? 'medium' : 'low'
            })
          }
        }
      })

      return movements.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    }
  })
}