import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { formatCurrency, formatExactDateTime } from '@/lib/dateUtils'

export interface HistoryItem {
  id: number
  tracked_item_nickname: string
  product_description: string
  establishment_name: string
  establishment_cnpj: string
  declared_price: number | null
  sale_price: number
  sale_date: string
  fetch_date: string
  item_type: 'produto' | 'combustivel'
  price_difference?: number
  price_difference_percentage?: number
}

export interface HistoryFilters {
  dateFrom?: string
  dateTo?: string
  itemType?: 'all' | 'produto' | 'combustivel'
  establishment?: string
  trackedItem?: string
}

export function useHistory(filters: HistoryFilters = {}) {
  return useQuery({
    queryKey: ['history', filters],
    queryFn: async () => {
      let query = supabase
        .from('price_history')
        .select(`
          id,
          sale_price,
          declared_price,
          sale_date,
          fetch_date,
          tracked_items!inner(
            id,
            nickname,
            item_type,
            search_criteria
          ),
          establishments!inner(
            cnpj,
            razao_social,
            nome_fantasia
          )
        `)
        .order('sale_date', { ascending: false })

      // Aplicar filtros
      if (filters.dateFrom) {
        query = query.gte('sale_date', filters.dateFrom)
      }
      
      if (filters.dateTo) {
        query = query.lte('sale_date', filters.dateTo)
      }

      if (filters.itemType && filters.itemType !== 'all') {
        query = query.eq('tracked_items.item_type', filters.itemType)
      }

      if (filters.establishment) {
        query = query.ilike('establishments.nome_fantasia', `%${filters.establishment}%`)
      }

      const { data, error } = await query.limit(1000)

      if (error) throw error

      return data.map(item => {
        const searchCriteria = item.tracked_items?.search_criteria as any
        const productDescription = searchCriteria?.produto?.descricao || 
                                 searchCriteria?.combustivel?.tipo || 
                                 'Item não identificado'

        const priceDifference = item.declared_price 
          ? item.sale_price - item.declared_price 
          : null

        const priceDifferencePercentage = item.declared_price && item.declared_price > 0
          ? ((item.sale_price - item.declared_price) / item.declared_price) * 100
          : null

        return {
          id: item.id,
          tracked_item_nickname: item.tracked_items?.nickname || 'Item',
          product_description: productDescription,
          establishment_name: item.establishments?.nome_fantasia || 
                             item.establishments?.razao_social || 
                             'Estabelecimento não identificado',
          establishment_cnpj: item.establishments?.cnpj || '',
          declared_price: item.declared_price,
          sale_price: item.sale_price,
          sale_date: item.sale_date,
          fetch_date: item.fetch_date,
          item_type: item.tracked_items?.item_type || 'produto',
          price_difference: priceDifference,
          price_difference_percentage: priceDifferencePercentage
        }
      }) as HistoryItem[]
    }
  })
}

export function useHistoryStats() {
  return useQuery({
    queryKey: ['history-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('price_history')
        .select(`
          sale_price,
          declared_price,
          tracked_items!inner(item_type)
        `)

      if (error) throw error

      const totalRecords = data.length
      const productRecords = data.filter(item => item.tracked_items?.item_type === 'produto').length
      const fuelRecords = data.filter(item => item.tracked_items?.item_type === 'combustivel').length
      
      const pricesWithDeclared = data.filter(item => item.declared_price !== null)
      const avgDifference = pricesWithDeclared.length > 0 
        ? pricesWithDeclared.reduce((sum, item) => sum + (item.sale_price - (item.declared_price || 0)), 0) / pricesWithDeclared.length
        : 0

      return {
        totalRecords,
        productRecords,
        fuelRecords,
        avgPriceDifference: avgDifference
      }
    }
  })
}