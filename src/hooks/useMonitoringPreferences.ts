import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export interface MonitoringPreferences {
  user_id: string;
  update_frequency_minutes: number;
  max_items_per_user: number;
  enable_notifications: boolean;
  price_change_threshold: number;
  created_at: string;
  updated_at: string;
}

export function useMonitoringPreferences() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['monitoring-preferences'],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('monitoring_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code === 'PGRST116') {
        // No preferences found, create default ones
        const { data: newData, error: insertError } = await supabase
          .from('monitoring_preferences')
          .insert([{
            user_id: user.id,
            update_frequency_minutes: 30,
            max_items_per_user: 50,
            enable_notifications: true,
            price_change_threshold: 5.0
          }])
          .select()
          .single();

        if (insertError) throw insertError;
        return newData as MonitoringPreferences;
      }

      if (error) throw error;
      return data as MonitoringPreferences;
    },
    enabled: !!user,
  });

  const updatePreferencesMutation = useMutation({
    mutationFn: async (updates: Partial<MonitoringPreferences>) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('monitoring_preferences')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monitoring-preferences'] });
      toast({
        title: "Preferências salvas!",
        description: "Suas configurações de monitoramento foram atualizadas.",
      });
    },
    onError: (error) => {
      console.error('Error updating monitoring preferences:', error);
      toast({
        title: "Erro ao salvar preferências",
        description: "Houve um problema ao salvar suas configurações.",
        variant: "destructive",
      });
    },
  });

  return {
    preferences: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    updatePreferences: updatePreferencesMutation.mutate,
    isUpdatingPreferences: updatePreferencesMutation.isPending,
    refetch: query.refetch,
  };
}