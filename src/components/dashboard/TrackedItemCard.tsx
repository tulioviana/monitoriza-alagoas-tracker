import { Edit2, Trash2, Play, Pause, TrendingUp, TrendingDown, Minus, MoreVertical, ArrowDown, ArrowUp, Target, Zap } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { LineChart, Line, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { useTrackedItems } from '@/hooks/useTrackedItems';
import { usePriceHistoryForSparkline } from '@/hooks/usePriceHistory';
import { useLatestPrice } from '@/hooks/useLatestPrice';
import { TrackedItem } from '@/hooks/useTrackedItems';
import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface TrackedItemCardProps {
  item: TrackedItem;
}

export function TrackedItemCard({ item }: TrackedItemCardProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editedNickname, setEditedNickname] = useState(item.nickname);
  
  const { updateItem, deleteItem, isUpdatingItem, isDeletingItem } = useTrackedItems();
  const { data: sparklineData, isLoading: sparklineLoading } = usePriceHistoryForSparkline(item.id);
  const { data: latestPrice } = useLatestPrice(item.id);

  const handleToggleActive = () => {
    updateItem({ id: item.id, updates: { is_active: !item.is_active } });
  };

  const handleEditNickname = () => {
    if (editedNickname.trim() && editedNickname !== item.nickname) {
      updateItem({ id: item.id, updates: { nickname: editedNickname.trim() } });
    }
    setIsEditModalOpen(false);
  };

  const handleDelete = () => {
    deleteItem(item.id);
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <ArrowUp className="h-4 w-4" />;
      case 'down':
        return <ArrowDown className="h-4 w-4" />;
      default:
        return <Target className="h-4 w-4" />;
    }
  };

  const getSparklineColor = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return '#ef4444'; // red-500
      case 'down':
        return '#22c55e'; // green-500
      default:
        return '#6b7280'; // gray-500
    }
  };

  const getTrendBadge = (trend: 'up' | 'down' | 'stable', percentage?: number, priceChange?: number) => {
    if (trend === 'stable') {
      return (
        <Badge className="gap-2 text-sm font-semibold bg-gradient-price-stable text-white border-0">
          <Target className="h-4 w-4" />
          ESTÁVEL
        </Badge>
      );
    }

    if (trend === 'down') {
      return (
        <Badge className="gap-2 text-sm font-semibold bg-gradient-price-down text-white border-0">
          <ArrowDown className="h-4 w-4" />
          DESCEU {priceChange ? `R$ ${Math.abs(priceChange).toFixed(2)}` : ''} 
          {percentage ? ` (${Math.abs(percentage).toFixed(1)}%)` : ''}
        </Badge>
      );
    }

    return (
      <Badge className="gap-2 text-sm font-semibold bg-gradient-price-up text-white border-0">
        <ArrowUp className="h-4 w-4" />
        SUBIU {priceChange ? `R$ ${priceChange.toFixed(2)}` : ''} 
        {percentage ? ` (${percentage.toFixed(1)}%)` : ''}
      </Badge>
    );
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const formatLastUpdate = (dateStr: string) => {
    return formatDistanceToNow(new Date(dateStr), { 
      addSuffix: true, 
      locale: ptBR 
    });
  };

  return (
    <Card className={cn(
      "relative transition-all duration-300 border-0 shadow-strong overflow-hidden group",
      item.is_active 
        ? "bg-gradient-success-active hover-card-active" 
        : "bg-gradient-warning-paused hover-card-paused",
      !item.is_active && "opacity-90"
    )}>
      {/* Status glow indicator */}
      <div className={cn(
        "absolute top-0 left-0 right-0 h-1",
        item.is_active ? "bg-green-400 shadow-lg shadow-green-400/50" : "bg-yellow-400 shadow-lg shadow-yellow-400/50"
      )} />
      
      {/* Inactive overlay */}
      {!item.is_active && (
        <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px] rounded-lg z-10 flex items-center justify-center">
          <div className="bg-black/60 backdrop-blur-sm rounded-full px-4 py-2 border border-yellow-400/30">
            <Badge variant="secondary" className="gap-2 text-sm bg-yellow-500/20 text-yellow-100 border-yellow-400/30">
              <Pause className="h-4 w-4" />
              Monitoramento Pausado
            </Badge>
          </div>
        </div>
      )}
      
      <CardContent className="p-6 space-y-6 text-white">
        {/* Header with nickname and actions */}
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-xl leading-tight text-white drop-shadow-sm">{item.nickname}</h3>
              {item.is_active && item.price_trend && item.price_trend !== 'stable' && (
                <Zap className="h-5 w-5 text-yellow-300 animate-pulse" />
              )}
            </div>
            <p className="text-sm text-white/80 line-clamp-2 font-medium">
              {latestPrice?.establishment_name || item.establishment_name}
            </p>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-white hover:bg-white/20 transition-colors">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsEditModalOpen(true)}>
                <Edit2 className="mr-2 h-4 w-4" />
                Editar apelido
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleToggleActive}>
                {item.is_active ? (
                  <>
                    <Pause className="mr-2 h-4 w-4" />
                    Pausar monitoramento
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Retomar monitoramento
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Remover item
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Hero Price Display */}
        <div className="space-y-3">
          <div className="text-5xl font-black text-white drop-shadow-lg leading-none">
            {item.last_price ? formatPrice(item.last_price) : (
              <span className="text-white/60">R$ --,--</span>
            )}
          </div>
          
          {/* Trend Badge */}
          {item.price_trend && item.is_active && item.price_trend !== 'stable' && (
            <div className="animate-fade-in">
              {getTrendBadge(item.price_trend)}
            </div>
          )}
        </div>

        {/* Enhanced Sparkline Chart */}
        <div className="h-20 w-full bg-black/20 rounded-lg p-3 backdrop-blur-sm border border-white/10">
          {sparklineLoading ? (
            <div className="h-full w-full flex items-center justify-center">
              <div className="h-full w-full rounded bg-white/10 animate-pulse shimmer" />
            </div>
          ) : sparklineData && sparklineData.length > 0 && item.is_active ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparklineData}>
                <defs>
                  <linearGradient id={`gradient-${item.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop 
                      offset="5%" 
                      stopColor={getSparklineColor(item.price_trend || 'stable')} 
                      stopOpacity={0.6}
                    />
                    <stop 
                      offset="95%" 
                      stopColor={getSparklineColor(item.price_trend || 'stable')} 
                      stopOpacity={0.1}
                    />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke={getSparklineColor(item.price_trend || 'stable')}
                  strokeWidth={3}
                  fill={`url(#gradient-${item.id})`}
                  dot={false}
                  activeDot={{ 
                    r: 4, 
                    fill: getSparklineColor(item.price_trend || 'stable'),
                    stroke: '#fff',
                    strokeWidth: 2
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full w-full flex items-center justify-center text-white/60 text-sm font-medium">
              {!item.is_active ? 'Gráfico pausado' : 'Aguardando dados...'}
            </div>
          )}
        </div>

        {/* Footer with enhanced info */}
        <div className="flex items-center justify-between text-xs text-white/70 pt-3 border-t border-white/20">
          <span className="font-medium">CNPJ: {latestPrice?.establishment_cnpj || item.establishment_cnpj || 'N/A'}</span>
          <div className="flex items-center gap-2">
            {item.is_active && (
              <div className="w-2 h-2 bg-green-400 rounded-full pulse-success"></div>
            )}
            <span className="font-medium">
              {item.last_updated_at ? 
                `Atualizado ${formatLastUpdate(item.last_updated_at)}` : 
                'Nunca atualizado'
              }
            </span>
          </div>
        </div>
      </CardContent>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Apelido</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="nickname">Novo apelido</Label>
              <Input
                id="nickname"
                value={editedNickname}
                onChange={(e) => setEditedNickname(e.target.value)}
                placeholder="Digite o novo apelido"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditNickname}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}