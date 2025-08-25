import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export interface SearchHistoryEntry {
  id: string;
  user_id: string;
  item_type: 'produto' | 'combustivel';
  search_criteria: any;
  searched_at: string;
  created_at: string;
}

export interface SaveSearchParams {
  item_type: 'produto' | 'combustivel';
  search_criteria: any;
}

export function useSearchHistory() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['search-history', user?.id],
    queryFn: async () => {
      if (!user?.id) {
        return [];
      }

      const { data, error } = await supabase
        .from('search_history')
        .select('*')
        .eq('user_id', user.id)
        .order('searched_at', { ascending: false });

      if (error) {
        console.error('Error fetching search history:', error);
        throw error;
      }

      return data as SearchHistoryEntry[];
    },
    enabled: !!user?.id,
  });

  const saveSearchMutation = useMutation({
    mutationFn: async (params: SaveSearchParams) => {
      if (!user) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('search_history')
        .insert({
          item_type: params.item_type,
          search_criteria: params.search_criteria,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['search-history'] });
    },
    onError: (error) => {
      console.error('Error saving search history:', error);
    },
  });

  const deleteSearchMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('search_history')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['search-history'] });
      toast({
        title: "Item removido!",
        description: "O item foi removido do histórico.",
      });
    },
    onError: (error) => {
      console.error('Error deleting search history:', error);
      toast({
        title: "Erro ao remover item",
        description: "Houve um problema ao remover o item do histórico.",
        variant: "destructive",
      });
    },
  });

  const clearHistoryMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('search_history')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['search-history'] });
      toast({
        title: "Histórico limpo!",
        description: "Todo o seu histórico de buscas foi removido.",
      });
    },
    onError: (error) => {
      console.error('Error clearing search history:', error);
      toast({
        title: "Erro ao limpar o histórico",
        description: "Houve um problema ao limpar o histórico de buscas.",
        variant: "destructive",
      });
    },
  });

  return {
    searchHistory: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    saveSearch: saveSearchMutation.mutate,
    isSavingSearch: saveSearchMutation.isPending,
    deleteSearch: deleteSearchMutation.mutate,
    isDeletingSearch: deleteSearchMutation.isPending,
    clearHistory: clearHistoryMutation.mutate,
    isClearingHistory: clearHistoryMutation.isPending,
    refetch: query.refetch,
  };
}
