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
  establishment_cnpj?: string;
  establishment_name?: string;
}

export interface AddTrackedItemParams {
  item_type: 'produto' | 'combustivel';
  search_criteria: any;
  nickname: string;
  establishment_cnpj: string;
  establishment_name: string;
}

export function useTrackedItems() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['tracked-items', user?.id],
    queryFn: async () => {
      if (!user?.id) {
        console.log('No user authenticated, returning empty array');
        return [];
      }

      console.log('Fetching tracked items for user:', user.id);
      
      const { data, error } = await supabase
        .from('tracked_items')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching tracked items:', error);
        throw error;
      }

      const items = data || [];
      console.log(`Fetched ${items.length} tracked items for user ${user.id}`);
      return items as TrackedItem[];
    },
    enabled: !!user?.id,
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
          user_id: user.id,
          establishment_cnpj: params.establishment_cnpj,
          establishment_name: params.establishment_name
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
      // Primeiro buscar o item para verificar se já está pausado
      const { data: item, error: fetchError } = await supabase
        .from('tracked_items')
        .select('is_active')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      if (item.is_active) {
        // Se ativo, apenas pausa (is_active = false)
        const { error } = await supabase
          .from('tracked_items')
          .update({ is_active: false })
          .eq('id', id);
        if (error) throw error;
      } else {
        // Se já pausado, exclui definitivamente
        const { error } = await supabase
          .from('tracked_items')
          .delete()
          .eq('id', id);
        if (error) throw error;
      }
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['tracked-items'] });
      // Buscar o item para verificar se ainda existe (foi pausado) ou foi excluído
      supabase
        .from('tracked_items')
        .select('is_active')
        .eq('id', id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            toast({
              title: "Item pausado!",
              description: "O item foi pausado. Clique em 'Remover' novamente para excluir definitivamente.",
            });
          } else {
            toast({
              title: "Item excluído!",
              description: "O item foi removido definitivamente do monitoramento.",
            });
          }
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