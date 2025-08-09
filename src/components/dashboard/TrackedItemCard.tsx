import { useState } from 'react';
import { MoreVertical, TrendingUp, TrendingDown, Minus, Edit3, Pause, Play, Trash2, Clock, Info } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TrackedItem } from '@/hooks/useTrackedItems';
import { useTrackedItems } from '@/hooks/useTrackedItems';
import { usePriceHistoryForSparkline, useLatestPrice } from '@/hooks/usePriceHistory';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface TrackedItemCardProps {
  item: TrackedItem;
}

export function TrackedItemCard({ item }: TrackedItemCardProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editedNickname, setEditedNickname] = useState(item.nickname);
  
  const { updateItem, deleteItem, isUpdatingItem, isDeletingItem } = useTrackedItems();
  const { data: sparklineData, isLoading: isLoadingSparkline } = usePriceHistoryForSparkline(item.id);
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

  const getTrendIcon = () => {
    switch (item.price_trend) {
      case 'up':
        return <TrendingUp className="h-3 w-3" />;
      case 'down':
        return <TrendingDown className="h-3 w-3" />;
      default:
        return <Minus className="h-3 w-3" />;
    }
  };

  const getSparklineColor = () => {
    switch (item.price_trend) {
      case 'up':
        return 'hsl(var(--error))';
      case 'down':
        return 'hsl(var(--success))';
      default:
        return 'hsl(var(--primary))';
    }
  };

  const getTrendBadge = () => {
    if (!item.price_trend || item.price_trend === 'stable') return null;
    
    const variant = item.price_trend === 'up' ? 'destructive' : 'default';
    const bgColor = item.price_trend === 'up' ? 'bg-error text-error-foreground' : 'bg-success text-success-foreground';
    
    return (
      <Badge className={`flex items-center gap-1 ${bgColor}`}>
        {getTrendIcon()}
        {item.price_trend === 'up' ? 'Subiu' : 'Desceu'}
      </Badge>
    );
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const formatLastUpdate = () => {
    if (!item.last_updated_at) return 'Aguardando primeira consulta...';
    
    return `Atualizado ${formatDistanceToNow(new Date(item.last_updated_at), { 
      addSuffix: true, 
      locale: ptBR 
    })}`;
  };

  return (
    <TooltipProvider>
      <Card className={`group transition-all duration-300 hover:-translate-y-1 hover:shadow-strong animate-fade-in-up ${!item.is_active ? 'opacity-60 relative' : ''}`}>
        {/* Inactive Overlay */}
        {!item.is_active && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-lg flex items-center justify-center z-10">
            <div className="bg-muted p-3 rounded-full">
              <Pause className="h-6 w-6 text-muted-foreground" />
            </div>
          </div>
        )}
        
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-bold truncate mb-1">{item.nickname}</h3>
              {latestPrice?.establishment_name && (
                <p className="text-sm text-muted-foreground truncate">
                  {latestPrice.establishment_name}
                </p>
              )}
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-popover border-border z-dropdown">
                <DropdownMenuItem onClick={() => setIsEditModalOpen(true)}>
                  <Edit3 className="mr-2 h-4 w-4" />
                  Editar nome
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
                <DropdownMenuItem 
                  onClick={handleDelete}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remover
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Price and Trend Display */}
          <div className="flex items-center justify-between">
            <div>
              {item.last_price ? (
                <div className="text-3xl font-bold tracking-tight">
                  {formatPrice(item.last_price)}
                </div>
              ) : (
                <div className="text-lg text-muted-foreground">
                  Buscando preço inicial...
                </div>
              )}
            </div>
            {getTrendBadge()}
          </div>

          {/* Intelligent Sparkline Chart */}
          <div className="h-20">
            {isLoadingSparkline ? (
              <Skeleton className="h-full w-full animate-pulse" />
            ) : sparklineData && sparklineData.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sparklineData}>
                  <Line 
                    type="monotone" 
                    dataKey="price" 
                    stroke={getSparklineColor()}
                    strokeWidth={2.5}
                    dot={false}
                    strokeLinecap="round"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center border-2 border-dashed border-muted rounded-lg">
                <div className="text-center space-y-2">
                  <div className="flex justify-center">
                    <svg className="w-8 h-8 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path strokeDasharray="3 3" d="M3 12h18m-9-9v18" />
                      <circle cx="7" cy="8" r="1" fill="currentColor" />
                      <circle cx="12" cy="16" r="1" fill="currentColor" />
                      <circle cx="17" cy="6" r="1" fill="currentColor" />
                    </svg>
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center justify-center gap-1 cursor-help">
                        <Info className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Aguardando histórico</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Aguardando mais dados para exibir o histórico de preços</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            )}
          </div>

          {/* Footer Info */}
          <div className="space-y-1 text-xs text-muted-foreground border-t pt-3">
            {latestPrice?.establishment_cnpj && (
              <div>CNPJ: {latestPrice.establishment_cnpj}</div>
            )}
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatLastUpdate()}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Nome do Item</DialogTitle>
            <DialogDescription>
              Altere o nome do item para facilitar a identificação.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-nickname" className="text-right">
                Nome
              </Label>
              <Input
                id="edit-nickname"
                value={editedNickname}
                onChange={(e) => setEditedNickname(e.target.value)}
                className="col-span-3"
                maxLength={100}
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsEditModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleEditNickname}
              disabled={!editedNickname.trim() || isUpdatingItem}
            >
              {isUpdatingItem ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}