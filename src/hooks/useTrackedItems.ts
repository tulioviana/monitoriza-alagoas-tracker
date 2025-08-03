import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export interface TrackedItem {
  id: number;
  user_id: string;
  item_type: 'produto' | 'combustivel';
  search_criteria: any;
  nickname: string;
  is_active: boolean;
  last_updated_at?: string;
  last_price?: number;
  price_trend?: 'up' | 'down' | 'stable';
  created_at: string;
  updated_at: string;
}

export interface AddTrackedItemParams {
  item_type: 'produto' | 'combustivel';
  search_criteria: any;
  nickname: string;
}

export function useTrackedItems() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['tracked-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tracked_items')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as TrackedItem[];
    },
  });

  const addItemMutation = useMutation({
    mutationFn: async (params: AddTrackedItemParams) => {
      if (!user) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('tracked_items')
        .insert({
          item_type: params.item_type,
          search_criteria: params.search_criteria,
          nickname: params.nickname,
          is_active: true,
          user_id: user.id
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracked-items'] });
      toast({
        title: "Item adicionado!",
        description: "O item foi adicionado ao monitoramento com sucesso.",
      });
    },
    onError: (error) => {
      console.error('Error adding tracked item:', error);
      toast({
        title: "Erro ao adicionar item",
        description: "Houve um problema ao adicionar o item ao monitoramento.",
        variant: "destructive",
      });
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<Omit<TrackedItem, 'id'>> }) => {
      const { data, error } = await supabase
        .from('tracked_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracked-items'] });
      toast({
        title: "Item atualizado!",
        description: "As alterações foram salvas com sucesso.",
      });
    },
    onError: (error) => {
      console.error('Error updating tracked item:', error);
      toast({
        title: "Erro ao atualizar item",
        description: "Houve um problema ao salvar as alterações.",
        variant: "destructive",
      });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('tracked_items')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracked-items'] });
      toast({
        title: "Item removido!",
        description: "O item foi removido do monitoramento.",
      });
    },
    onError: (error) => {
      console.error('Error deleting tracked item:', error);
      toast({
        title: "Erro ao remover item",
        description: "Houve um problema ao remover o item do monitoramento.",
        variant: "destructive",
      });
    },
  });

  return {
    trackedItems: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    addItem: addItemMutation.mutate,
    isAddingItem: addItemMutation.isPending,
    updateItem: updateItemMutation.mutate,
    isUpdatingItem: updateItemMutation.isPending,
    deleteItem: deleteItemMutation.mutate,
    isDeletingItem: deleteItemMutation.isPending,
    refetch: query.refetch,
  };
}