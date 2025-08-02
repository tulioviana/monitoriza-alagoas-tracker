import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

export interface SearchHistoryItem {
  id: number
  product_description: string
  establishment_name: string
  establishment_cnpj: string
  current_price: number
  sale_date: string
  item_type: 'produto' | 'combustivel'
}

export function useSearchHistory() {
  return useQuery({
    queryKey: ['search-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('price_history')
        .select(`
          id,
          sale_price,
          sale_date,
          tracked_items!inner(
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
        .limit(100)

      if (error) throw error

      return data.map(item => {
        const searchCriteria = item.tracked_items?.search_criteria as any
        return {
          id: item.id,
          product_description: searchCriteria?.produto?.descricao || 'Produto não identificado',
          establishment_name: item.establishments?.nome_fantasia || item.establishments?.razao_social || 'Estabelecimento não identificado',
          establishment_cnpj: item.establishments?.cnpj || '',
          current_price: item.sale_price,
          sale_date: item.sale_date,
          item_type: item.tracked_items?.item_type || 'produto'
        }
      }) as SearchHistoryItem[]
    }
  })
}