import React, { useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MoreVertical, TrendingUp, TrendingDown, Minus, Edit, Play, Pause, Trash2, MapPin, Clock } from 'lucide-react'
import { useTrackedItems } from '@/hooks/useTrackedItems'
import { useLatestPrice } from '@/hooks/usePriceHistory'
import { TrackedItem } from '@/hooks/useTrackedItems'
import { formatRelativeTime, formatCurrency, formatCnpj } from '@/lib/dateUtils'
import { useToast } from '@/hooks/use-toast'

interface TrackedItemCardProps {
  item: TrackedItem;
}

export function TrackedItemCard({ item }: TrackedItemCardProps) {
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
      up: 'bg-green-100 text-green-800 border-green-200',
      down: 'bg-red-100 text-red-800 border-red-200',
      stable: 'bg-gray-100 text-gray-800 border-gray-200'
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

  return (
    <div className="relative">
      <Card className={`transition-all duration-200 hover:shadow-lg ${
        item.is_active 
          ? 'border-t-4 border-t-green-500 bg-gradient-success-active' 
          : 'border-t-4 border-t-yellow-600 bg-gradient-warning-paused opacity-75'
      }`}>
        {!item.is_active && (
          <div className="absolute inset-0 bg-gray-900/10 rounded-lg flex items-center justify-center z-10">
            <div className="bg-yellow-100 border border-yellow-300 rounded-lg px-4 py-2 flex items-center gap-2">
              <Pause className="w-4 h-4 text-yellow-600" />
              <span className="text-yellow-800 font-medium">Monitoramento Pausado</span>
            </div>
          </div>
        )}
        
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg text-gray-900 truncate">
                {item.nickname}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {item.establishment_name}
              </p>
            </div>
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
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Price Display */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-white/50 rounded-lg">
            <div className="text-center">
              <div className="text-sm text-gray-600 font-medium mb-1">Valor de Venda</div>
              <div className="text-2xl font-bold text-gray-900">
                {item.last_price ? formatPrice(item.last_price) : 'N/A'}
              </div>
            </div>
            {latestPrice && (
              <div className="text-center">
                <div className="text-sm text-gray-600 font-medium mb-1">Valor Declarado</div>
                <div className="text-lg font-semibold text-gray-700">
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

          {/* Establishment Info */}
          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-gray-700">
                <span className="font-medium">CNPJ:</span> {formatCnpj(item.establishment_cnpj || '')}
              </div>
            </div>
            {item.last_updated_at && (
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-gray-700">
                  <span className="font-medium">Última atualização:</span> {formatLastUpdate(item.last_updated_at)}
                </div>
              </div>
            )}
          </div>

          {/* Latest Price Info */}
          {latestPrice && (
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="text-sm font-medium text-blue-900 mb-2">Última Verificação</div>
              <div className="text-sm">
                <span className="text-blue-700 font-medium">Data:</span>
                <div className="text-blue-900">{formatRelativeTime(latestPrice.fetch_date)}</div>
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