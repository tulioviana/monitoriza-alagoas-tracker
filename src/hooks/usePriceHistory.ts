import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PriceHistoryEntry {
  id: number;
  tracked_item_id: number;
  fetch_date: string;
  sale_price: number;
  declared_price?: number;
  establishment_name?: string;
  establishment_cnpj?: string;
  establishment_address?: any;
  api_response_metadata?: any;
  price_change_percent?: number;
  created_at: string;
}

export function usePriceHistory(trackedItemId: number, limit: number = 10) {
  return useQuery({
    queryKey: ['price-history', trackedItemId, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('price_history')
        .select('*')
        .eq('tracked_item_id', trackedItemId)
        .order('fetch_date', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as PriceHistoryEntry[];
    },
    enabled: !!trackedItemId,
  });
}

export function useLatestPrice(trackedItemId: number) {
  return useQuery({
    queryKey: ['latest-price', trackedItemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('price_history')
        .select('*')
        .eq('tracked_item_id', trackedItemId)
        .order('fetch_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as PriceHistoryEntry | null;
    },
    enabled: !!trackedItemId,
  });
}

export function usePriceHistoryForSparkline(trackedItemId: number) {
  return useQuery({
    queryKey: ['price-history-sparkline', trackedItemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('price_history')
        .select('sale_price, fetch_date')
        .eq('tracked_item_id', trackedItemId)
        .order('fetch_date', { ascending: true })
        .limit(20); // Last 20 price points for sparkline

      if (error) throw error;
      return data.map(entry => ({
        price: parseFloat(entry.sale_price.toString()),
        date: entry.fetch_date,
      }));
    },
    enabled: !!trackedItemId,
  });
}