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
      <Card>
        <CardContent className="p-12">
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
              <Bell className="h-8 w-8 text-muted-foreground" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Nenhum item monitorado ainda</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Adicione produtos ou combustíveis ao monitoramento para acompanhar 
                a evolução dos preços em tempo real.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button onClick={() => navigate('/?tab=products')}>
                <Plus className="mr-2 h-4 w-4" />
                Buscar Produtos
              </Button>
              <Button variant="outline" onClick={() => navigate('/?tab=fuels')}>
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
        {safeTrackedItems.map((item) => (
          <TrackedItemCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}