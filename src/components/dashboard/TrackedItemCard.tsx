import { useState } from 'react'
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { MoreVertical, Edit3, Trash2, Play, Pause, FileText, Calendar, Clock, RefreshCw } from 'lucide-react'
import { TrackedItem, useTrackedItems } from '@/hooks/useTrackedItems'
import { useLatestPrice } from '@/hooks/usePriceHistory'
import { useIndividualPriceUpdate } from '@/hooks/useIndividualPriceUpdate'
import { usePlan } from '@/contexts/PlanContext'
import { formatCurrency, formatRelativeTime, formatCnpj } from '@/lib/dateUtils'
import { toast } from 'sonner'

interface TrackedItemCardProps {
  item: TrackedItem
  viewMode?: 'grid' | 'list'
}

export function TrackedItemCard({ item, viewMode = 'grid' }: TrackedItemCardProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editedNickname, setEditedNickname] = useState(item.nickname)
  const { updateItem, deleteItem } = useTrackedItems()
  const { data: latestPrice } = useLatestPrice(item.id)
  const { executeUpdate, isUpdating } = useIndividualPriceUpdate()
  const { isPro } = usePlan()

  const handleToggleActive = () => {
    updateItem({ 
      id: item.id, 
      updates: { is_active: !item.is_active } 
    })
    toast.success(item.is_active ? 'Monitoramento pausado' : 'Monitoramento reativado')
  }

  const handleEditNickname = () => {
    if (editedNickname.trim() === '') {
      toast.error('O apelido não pode estar vazio')
      return
    }

    updateItem({ 
      id: item.id, 
      updates: { nickname: editedNickname.trim() } 
    })
    toast.success('Apelido atualizado com sucesso')
    setIsEditModalOpen(false)
  }

  const handleDelete = () => {
    deleteItem(item.id)
    toast.success('Item removido do monitoramento')
  }

  const handleUpdatePrice = () => {
    if (!isPro) {
      toast.error('Atualização manual é exclusiva para usuários Pro')
      return
    }
    executeUpdate(item.id)
  }

  const cardStyles = item.is_active 
    ? "bg-[hsl(var(--card-active))] border-[hsl(var(--card-active-border))]"
    : "bg-[hsl(var(--card-paused))] border-[hsl(var(--card-paused-border))]"

  return (
    <Card className={`p-6 transition-all duration-200 hover:shadow-md ${cardStyles}`}>
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-bold text-foreground mb-1">
            {item.nickname}
          </h3>
          <p className="text-sm text-muted-foreground">
            {item.establishment_name}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggleActive}
            className={`h-8 w-8 p-0 ${
              item.is_active 
                ? 'text-green-600 hover:text-green-700 hover:bg-green-50' 
                : 'text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50'
            }`}
          >
            {item.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogTrigger asChild>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <Edit3 className="mr-2 h-4 w-4" />
                    Editar apelido
                  </DropdownMenuItem>
                </DialogTrigger>
              </Dialog>
              {isPro && (
                <DropdownMenuItem 
                  onClick={handleUpdatePrice}
                  disabled={isUpdating}
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${isUpdating ? 'animate-spin' : ''}`} />
                  {isUpdating ? 'Atualizando...' : 'Atualizar preços'}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                <Trash2 className="mr-2 h-4 w-4" />
                Remover
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Preços */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Valor de Venda</p>
          <p className="text-2xl font-bold text-primary">
            {latestPrice?.sale_price ? formatCurrency(latestPrice.sale_price) : 'N/A'}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Valor Declarado</p>
          <p className="text-lg font-medium text-muted-foreground">
            {latestPrice?.declared_price ? formatCurrency(latestPrice.declared_price) : 'N/A'}
          </p>
        </div>
      </div>

      {/* Informações adicionais */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <FileText className="h-4 w-4" />
          <span>{formatCnpj(item.establishment_cnpj)}</span>
        </div>
        
        {(() => {
          // Buscar a data da última venda real dos metadados da SEFAZ
          const saleDate = latestPrice?.api_response_metadata?.sale_date;
          const displayDate = saleDate || latestPrice?.fetch_date;
          
          return displayDate && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Última venda: {formatRelativeTime(displayDate)}</span>
            </div>
          );
        })()}
        
        {item.last_updated_at && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Atualizado: {formatRelativeTime(item.last_updated_at)}</span>
          </div>
        )}
      </div>

      {/* Status Badge */}
      {!item.is_active && (
        <div className="mt-4">
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">
            Pausado
          </Badge>
        </div>
      )}

      {/* Modal de edição */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Apelido</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="nickname">Apelido</Label>
              <Input
                id="nickname"
                value={editedNickname}
                onChange={(e) => setEditedNickname(e.target.value)}
                placeholder="Digite o novo apelido"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsEditModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button onClick={handleEditNickname}>
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}