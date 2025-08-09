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
      <div className="relative">
        {/* Animated background gradient */}
        <div className="absolute inset-0 bg-gradient-primary opacity-5 rounded-2xl animate-pulse"></div>
        
        <Card className="relative bg-gradient-surface border-primary/20 shadow-strong border-2">
          <CardContent className="p-16">
            <div className="text-center space-y-8 animate-fade-in">
              {/* Animated icon with glow effect */}
              <div className="relative mx-auto w-32 h-32">
                <div className="absolute inset-0 bg-gradient-primary rounded-full opacity-20 animate-pulse"></div>
                <div className="relative w-32 h-32 bg-gradient-secondary rounded-full flex items-center justify-center shadow-strong">
                  <Bell className="h-16 w-16 text-primary animate-bounce" style={{ animationDelay: '1s' }} />
                </div>
                {/* Decorative rings */}
                <div className="absolute -inset-4 border-2 border-primary/20 rounded-full animate-ping"></div>
                <div className="absolute -inset-2 border border-primary/10 rounded-full animate-ping" style={{ animationDelay: '0.5s' }}></div>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-display-lg font-bold bg-gradient-primary bg-clip-text text-transparent">
                  Seu Centro de Monitoramento Inteligente
                </h3>
                <p className="text-body-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                  🎯 Transforme-se em um especialista em preços! Monitore produtos e combustíveis em tempo real, 
                  receba alertas instantâneos de variações e nunca mais perca uma oportunidade de economia.
                </p>
                
                {/* Feature highlights */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 max-w-4xl mx-auto">
                  <div className="p-4 bg-gradient-success-active/10 rounded-lg border border-green-500/20">
                    <div className="text-2xl mb-2">📊</div>
                    <h4 className="font-semibold text-green-700 dark:text-green-300">Análise Inteligente</h4>
                    <p className="text-sm text-muted-foreground">Gráficos e tendências automáticas</p>
                  </div>
                  <div className="p-4 bg-gradient-primary/10 rounded-lg border border-primary/20">
                    <div className="text-2xl mb-2">⚡</div>
                    <h4 className="font-semibold text-primary">Alertas em Tempo Real</h4>
                    <p className="text-sm text-muted-foreground">Notificações instantâneas de mudanças</p>
                  </div>
                  <div className="p-4 bg-gradient-warning-paused/10 rounded-lg border border-yellow-500/20">
                    <div className="text-2xl mb-2">💰</div>
                    <h4 className="font-semibold text-yellow-700 dark:text-yellow-300">Economia Garantida</h4>
                    <p className="text-sm text-muted-foreground">Encontre sempre o melhor preço</p>
                  </div>
                </div>
              </div>

              {/* Enhanced CTAs */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                <Button 
                  onClick={() => navigate('/?tab=products')} 
                  size="lg"
                  className="bg-gradient-primary hover:scale-105 transition-all duration-300 shadow-strong text-lg font-bold min-w-[200px]"
                >
                  <Plus className="mr-3 h-5 w-5" />
                  Buscar Produtos
                  <span className="ml-2 text-xs bg-white/20 rounded-full px-2 py-1">Popular</span>
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/?tab=fuels')} 
                  size="lg"
                  className="border-2 border-primary/30 hover:bg-primary/10 hover:scale-105 transition-all duration-300 text-lg font-semibold min-w-[200px]"
                >
                  <Plus className="mr-3 h-5 w-5" />
                  Buscar Combustíveis
                </Button>
              </div>
              
              {/* Engagement hint */}
              <div className="mt-8 p-4 bg-info/10 rounded-lg border border-info/20 max-w-md mx-auto">
                <p className="text-sm text-info font-medium">
                  💡 Dica: Comece monitorando 3-5 produtos que você compra frequentemente para ver resultados imediatos!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
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