import { Bell, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrackedItemCard } from './TrackedItemCard';
import { NextUpdateCountdown } from './NextUpdateCountdown';
import { useTrackedItems } from '@/hooks/useTrackedItems';
import { useNavigate } from 'react-router-dom';

export function TrackedItemsGrid() {
  const { trackedItems, isLoading, isError, error } = useTrackedItems();
  const navigate = useNavigate();
  
  // Defensive check to ensure trackedItems is always an array
  const safeTrackedItems = Array.isArray(trackedItems) ? trackedItems : [];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-start">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-8 w-8 rounded" />
              </div>
              <Skeleton className="h-4 w-1/2" />
              <div className="flex justify-between items-center">
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-6 w-16" />
              </div>
              <Skeleton className="h-12 w-full" />
              <div className="space-y-1">
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (isError) {
    console.error('TrackedItemsGrid error:', error);
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-destructive space-y-4">
            <div>Erro ao carregar itens monitorados. Tente recarregar a página.</div>
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()}
              className="mt-4"
            >
              Recarregar Página
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (safeTrackedItems.length === 0) {
    return (
      <Card className="bg-gradient-surface border-card-border shadow-medium">
        <CardContent className="p-12">
          <div className="text-center space-y-6 animate-fade-in">
            <div className="mx-auto w-20 h-20 bg-gradient-secondary rounded-full flex items-center justify-center shadow-soft">
              <Bell className="h-10 w-10 text-muted-foreground" />
            </div>
            
            <div className="space-y-3">
              <h3 className="text-display-md">Sua lista de monitoramento está vazia</h3>
              <p className="text-body-md text-muted-foreground max-w-lg mx-auto">
                Comece a buscar por produtos ou combustíveis para adicionar itens e nunca mais perca uma variação de preço.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={() => navigate('/?tab=products')} className="hover-scale">
                <Plus className="mr-2 h-4 w-4" />
                Buscar Produtos
              </Button>
              <Button variant="outline" onClick={() => navigate('/?tab=fuels')} className="hover-scale">
                <Plus className="mr-2 h-4 w-4" />
                Buscar Combustíveis
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <NextUpdateCountdown />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {safeTrackedItems.map((item, index) => (
          <div 
            key={item.id} 
            className="animate-fade-in-up"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <TrackedItemCard item={item} />
          </div>
        ))}
      </div>
    </div>
  );
}