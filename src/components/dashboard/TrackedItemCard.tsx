import { useState } from 'react';
import { MoreVertical, TrendingUp, TrendingDown, Minus, Edit3, Pause, Play, Trash2 } from 'lucide-react';
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
        return <TrendingUp className="h-4 w-4 text-red-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-green-500" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTrendBadge = () => {
    if (!item.price_trend || item.price_trend === 'stable') return null;
    
    return (
      <Badge variant={item.price_trend === 'up' ? 'error' : 'success'} className="flex items-center gap-1">
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
    <>
      <Card className={`transition-all duration-200 hover:shadow-lg ${!item.is_active ? 'opacity-60' : ''}`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg truncate">{item.nickname}</h3>
              {latestPrice?.establishment_name && (
                <p className="text-sm text-muted-foreground truncate">
                  {latestPrice.establishment_name}
                </p>
              )}
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
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
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remover
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Price Display */}
          <div className="flex items-center justify-between">
            <div>
              {item.last_price ? (
                <div className="text-2xl font-bold">
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

          {/* Sparkline Chart */}
          <div className="h-12">
            {isLoadingSparkline ? (
              <Skeleton className="h-full w-full" />
            ) : sparklineData && sparklineData.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sparklineData}>
                  <Line 
                    type="monotone" 
                    dataKey="price" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                Histórico insuficiente para gráfico
              </div>
            )}
          </div>

          {/* Footer Info */}
          <div className="space-y-1 text-xs text-muted-foreground">
            {latestPrice?.establishment_cnpj && (
              <div>CNPJ: {latestPrice.establishment_cnpj}</div>
            )}
            <div>{formatLastUpdate()}</div>
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
    </>
  );
}