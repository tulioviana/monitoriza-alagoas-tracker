import React, { useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MoreVertical, TrendingUp, TrendingDown, Minus, Edit, Play, Pause, Trash2, MapPin, Clock, DollarSign, Receipt } from 'lucide-react'
import { useTrackedItems } from '@/hooks/useTrackedItems'
import { useLatestPrice } from '@/hooks/usePriceHistory'
import { TrackedItem } from '@/hooks/useTrackedItems'
import { formatRelativeTime, formatCurrency, formatCnpj } from '@/lib/dateUtils'
import { useToast } from '@/hooks/use-toast'

interface TrackedItemCardProps {
  item: TrackedItem
  viewMode?: 'grid' | 'list'
}

export function TrackedItemCard({ item, viewMode = 'grid' }: TrackedItemCardProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editedNickname, setEditedNickname] = useState(item.nickname)
  
  const { updateItem, deleteItem, isUpdatingItem, isDeletingItem } = useTrackedItems()
  const { data: latestPrice } = useLatestPrice(item.id)
  const { toast } = useToast()

  const handleToggleActive = () => {
    updateItem({ 
      id: item.id, 
      updates: { is_active: !item.is_active } 
    })
  }

  const handleEditNickname = () => {
    if (editedNickname.trim() && editedNickname !== item.nickname) {
      updateItem({ 
        id: item.id, 
        updates: { nickname: editedNickname.trim() } 
      })
    }
    setIsEditModalOpen(false)
  }

  const handleDelete = () => {
    deleteItem(item.id)
  }

  const formatPrice = (price: number) => {
    return formatCurrency(price)
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-500" />
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-500" />
      default:
        return <Minus className="w-4 h-4 text-gray-500" />
    }
  }

  const getTrendBadge = (trend: string) => {
    const variants = {
      up: 'bg-gradient-to-r from-red-50 to-red-100 text-red-700 border-red-200',
      down: 'bg-gradient-to-r from-green-50 to-green-100 text-green-700 border-green-200',
      stable: 'bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 border-blue-200'
    }
    
    const labels = {
      up: 'Em Alta',
      down: 'Em Baixa', 
      stable: 'Estável'
    }
    
    return (
      <Badge variant="outline" className={variants[trend as keyof typeof variants] || variants.stable}>
        {getTrendIcon(trend)}
        <span className="ml-1">{labels[trend as keyof typeof labels] || 'Estável'}</span>
      </Badge>
    )
  }

  const formatLastUpdate = (dateStr: string) => {
    return formatRelativeTime(dateStr)
  }

  if (viewMode === 'list') {
    return (
      <div className="relative">
        <Card className={`transition-all duration-300 hover:shadow-lg animate-fade-in ${
          item.is_active 
            ? 'border-l-4 border-l-green-500 bg-gradient-success-active hover-card-active' 
            : 'border-l-4 border-l-yellow-600 bg-gradient-warning-paused hover-card-paused opacity-85'
        }`}>
          {!item.is_active && (
            <div className="absolute top-2 right-2 z-10">
              <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                <Pause className="w-3 h-3 mr-1" />
                Pausado
              </Badge>
            </div>
          )}
          
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4">
              {/* Left: Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-semibold text-lg text-foreground truncate">
                    {item.nickname}
                  </h3>
                  {item.price_trend && (
                    <div className="flex-shrink-0">
                      {getTrendBadge(item.price_trend)}
                    </div>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-1">
                  {item.establishment_name}
                </p>
                <p className="text-xs text-muted-foreground">
                  CNPJ: {formatCnpj(item.establishment_cnpj || '')}
                </p>
              </div>

              {/* Center: Prices */}
              <div className="flex gap-6">
                <div className="text-center">
                  <div className="flex items-center gap-1 mb-1">
                    <DollarSign className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">Venda</span>
                  </div>
                  <div className="text-xl font-bold text-foreground">
                    {item.last_price ? formatPrice(item.last_price) : 'N/A'}
                  </div>
                </div>
                {latestPrice && (
                  <div className="text-center">
                    <div className="flex items-center gap-1 mb-1">
                      <Receipt className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground">Declarado</span>
                    </div>
                    <div className="text-lg font-semibold text-muted-foreground">
                      {formatPrice(latestPrice.declared_price)}
                    </div>
                  </div>
                )}
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-2">
                {item.last_updated_at && (
                  <div className="text-xs text-muted-foreground text-right mr-3">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatLastUpdate(item.last_updated_at)}
                    </div>
                  </div>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setIsEditModalOpen(true)}>
                      <Edit className="w-4 h-4 mr-2" />
                      Editar apelido
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleToggleActive}>
                      {item.is_active ? (
                        <>
                          <Pause className="w-4 h-4 mr-2" />
                          Pausar monitoramento
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-2" />
                          Retomar monitoramento
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Edit Modal */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Apelido</DialogTitle>
              <DialogDescription>
                Altere o apelido para identificar melhor este item.
              </DialogDescription>
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
              <Button 
                variant="outline" 
                onClick={() => setIsEditModalOpen(false)}
                disabled={isUpdatingItem}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleEditNickname}
                disabled={!editedNickname.trim() || isUpdatingItem}
              >
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  return (
    <div className="relative">
      <Card className={`transition-all duration-300 hover:shadow-lg animate-fade-in group ${
        item.is_active 
          ? 'border-t-4 border-t-green-500 bg-gradient-success-active hover-card-active' 
          : 'border-t-4 border-t-yellow-600 bg-gradient-warning-paused hover-card-paused opacity-85'
      }`}>
        {!item.is_active && (
          <div className="absolute inset-0 bg-gray-900/5 rounded-lg flex items-center justify-center z-10 backdrop-blur-[1px]">
            <div className="bg-yellow-50 border border-yellow-300 rounded-lg px-4 py-2 flex items-center gap-2 shadow-medium">
              <Pause className="w-4 h-4 text-yellow-600" />
              <span className="text-yellow-800 font-medium">Monitoramento Pausado</span>
            </div>
          </div>
        )}
        
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-xl text-foreground truncate mb-1 group-hover:text-primary transition-colors">
                {item.nickname}
              </h3>
              <p className="text-sm text-muted-foreground font-medium">
                {item.establishment_name}
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-70 hover:opacity-100 transition-opacity">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsEditModalOpen(true)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Editar apelido
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleToggleActive}>
                  {item.is_active ? (
                    <>
                      <Pause className="w-4 h-4 mr-2" />
                      Pausar monitoramento
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Retomar monitoramento
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Enhanced Price Display */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-white/70 backdrop-blur-sm rounded-lg border border-white/50 shadow-soft">
            <div className="text-center group">
              <div className="flex items-center justify-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-muted-foreground">Valor de Venda</span>
              </div>
              <div className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors">
                {item.last_price ? formatPrice(item.last_price) : 'N/A'}
              </div>
            </div>
            {latestPrice && (
              <div className="text-center group">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Receipt className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-semibold text-muted-foreground">Valor Declarado</span>
                </div>
                <div className="text-lg font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
                  {formatPrice(latestPrice.declared_price)}
                </div>
              </div>
            )}
          </div>

          {item.price_trend && (
            <div className="flex justify-center">
              {getTrendBadge(item.price_trend)}
            </div>
          )}

          {/* Enhanced Establishment Info */}
          <div className="bg-muted/30 rounded-lg p-4 space-y-3 backdrop-blur-sm">
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <span className="font-semibold text-foreground">CNPJ:</span>
                <div className="text-muted-foreground font-mono">{formatCnpj(item.establishment_cnpj || '')}</div>
              </div>
            </div>
            {item.last_updated_at && (
              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <span className="font-semibold text-foreground">Última atualização:</span>
                  <div className="text-muted-foreground">{formatLastUpdate(item.last_updated_at)}</div>
                </div>
              </div>
            )}
          </div>

          {/* Latest Price Info */}
          {latestPrice && (
            <div className="bg-primary/10 rounded-lg p-3 border border-primary/20">
              <div className="text-sm font-semibold text-primary mb-2">Última Verificação</div>
              <div className="text-sm text-muted-foreground">
                <span className="font-medium">Data:</span> {formatRelativeTime(latestPrice.fetch_date)}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Apelido</DialogTitle>
            <DialogDescription>
              Altere o apelido para identificar melhor este item.
            </DialogDescription>
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
            <Button 
              variant="outline" 
              onClick={() => setIsEditModalOpen(false)}
              disabled={isUpdatingItem}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleEditNickname}
              disabled={!editedNickname.trim() || isUpdatingItem}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}