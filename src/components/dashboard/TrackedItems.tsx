
import { Monitor } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { useTrackedItems, useToggleTrackedItem, useDeleteTrackedItem } from '@/hooks/useTrackedItems'
import { useTrackedItemsFilters } from '@/hooks/useTrackedItemsFilters'
import { TrackedItemsHeader } from './TrackedItemsHeader'
import { TrackedItemsGrid } from './TrackedItemsGrid'

export function TrackedItems() {
  const { data: trackedItems = [], isLoading, error } = useTrackedItems()
  const toggleMutation = useToggleTrackedItem()
  const deleteMutation = useDeleteTrackedItem()
  
  const {
    filteredItems,
    stats,
    searchTerm,
    setSearchTerm,
    typeFilter,
    setTypeFilter,
    statusFilter,
    setStatusFilter
  } = useTrackedItemsFilters(trackedItems)

  const handleToggleItem = (id: number, currentStatus: boolean) => {
    toggleMutation.mutate({ id, is_active: !currentStatus })
  }

  const handleDeleteItem = (id: number) => {
    if (confirm('Tem certeza que deseja remover este item do monitoramento?')) {
      deleteMutation.mutate(id)
    }
  }

  const handleAddNewItem = () => {
    // TODO: Implementar modal/página de adicionar novo item
    console.log('Adicionar novo item')
  }

  if (error) {
    return (
      <div className="space-y-6">
        <TrackedItemsHeader
          stats={stats}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          typeFilter={typeFilter}
          onTypeFilterChange={setTypeFilter}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          onAddNewItem={handleAddNewItem}
        />
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-destructive mb-2 font-medium">Erro ao carregar itens monitorados</p>
            <p className="text-muted-foreground text-sm text-center">{error.message}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Empty state for when user has no tracked items at all
  if (!isLoading && trackedItems.length === 0) {
    return (
      <div className="space-y-6">
        <TrackedItemsHeader
          stats={stats}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          typeFilter={typeFilter}
          onTypeFilterChange={setTypeFilter}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          onAddNewItem={handleAddNewItem}
        />
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Monitor className="h-16 w-16 text-muted-foreground mb-6" />
            <h3 className="text-xl font-semibold mb-3">Nenhum item monitorado</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              Comece a monitorar produtos e combustíveis para acompanhar suas variações de preço em tempo real
            </p>
            <button
              onClick={handleAddNewItem}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Adicionar Primeiro Item
            </button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <TrackedItemsHeader
        stats={stats}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        onAddNewItem={handleAddNewItem}
      />
      
      <TrackedItemsGrid
        items={filteredItems}
        onToggleItem={handleToggleItem}
        onDeleteItem={handleDeleteItem}
        isLoading={isLoading}
        toggleMutationState={{
          isPending: toggleMutation.isPending,
          variables: toggleMutation.variables
        }}
        deleteMutationState={{
          isPending: deleteMutation.isPending,
          variables: deleteMutation.variables
        }}
      />
    </div>
  )
}
