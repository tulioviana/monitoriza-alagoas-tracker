
import { useState, useMemo } from 'react'
import { useTrackedItems, useToggleTrackedItem, useDeleteTrackedItem } from '@/hooks/useTrackedItems'
import { TrackedItemsHeader } from './TrackedItemsHeader'
import { TrackedItemCard } from './TrackedItemCard'
import { TrackedItemsSkeleton } from './TrackedItemsSkeleton'
import { TrackedItemsEmpty } from './TrackedItemsEmpty'

export function TrackedItems() {
  const { data: trackedItems, isLoading, error } = useTrackedItems()
  const toggleMutation = useToggleTrackedItem()
  const deleteMutation = useDeleteTrackedItem()

  // State for filters and search
  const [searchTerm, setSearchTerm] = useState('')
  const [filterBy, setFilterBy] = useState('all')
  const [sortBy, setSortBy] = useState('updated')

  const handleToggleItem = (id: number, currentStatus: boolean) => {
    toggleMutation.mutate({ id, is_active: !currentStatus })
  }

  const handleDeleteItem = (id: number) => {
    if (confirm('Tem certeza que deseja remover este item do monitoramento?')) {
      deleteMutation.mutate(id)
    }
  }

  const handleAddProduct = () => {
    // TODO: Implementar navegação para adicionar produto
    console.log('Add product')
  }

  const handleAddFuel = () => {
    // TODO: Implementar navegação para adicionar combustível
    console.log('Add fuel')
  }

  // Filter and sort items
  const filteredAndSortedItems = useMemo(() => {
    if (!trackedItems) return []

    let filtered = trackedItems.filter(item => {
      const matchesSearch = item.nickname.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (item.establishment?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
      
      const matchesFilter = filterBy === 'all' ||
                          (filterBy === 'active' && item.is_active) ||
                          (filterBy === 'paused' && !item.is_active) ||
                          (filterBy === item.item_type)
      
      return matchesSearch && matchesFilter
    })

    // Sort items
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.nickname.localeCompare(b.nickname)
        case 'savings':
          const savingsA = (a.last_price && a.current_price && a.last_price > a.current_price) 
            ? a.last_price - a.current_price : 0
          const savingsB = (b.last_price && b.current_price && b.last_price > b.current_price) 
            ? b.last_price - b.current_price : 0
          return savingsB - savingsA
        case 'price-increase':
          const increaseA = (a.current_price && a.last_price && a.current_price > a.last_price) 
            ? ((a.current_price - a.last_price) / a.last_price) * 100 : 0
          const increaseB = (b.current_price && b.last_price && b.current_price > b.last_price) 
            ? ((b.current_price - b.last_price) / b.last_price) * 100 : 0
          return increaseB - increaseA
        case 'price-decrease':
          const decreaseA = (a.last_price && a.current_price && a.last_price > a.current_price) 
            ? ((a.last_price - a.current_price) / a.last_price) * 100 : 0
          const decreaseB = (b.last_price && b.current_price && b.last_price > b.current_price) 
            ? ((b.last_price - b.current_price) / b.last_price) * 100 : 0
          return decreaseB - decreaseA
        default: // 'updated'
          const dateA = new Date(a.fetch_date || a.sale_date || 0).getTime()
          const dateB = new Date(b.fetch_date || b.sale_date || 0).getTime()
          return dateB - dateA
      }
    })

    return filtered
  }, [trackedItems, searchTerm, filterBy, sortBy])

  // Calculate statistics
  const stats = useMemo(() => {
    if (!trackedItems) return { total: 0, active: 0, paused: 0, products: 0, fuels: 0 }
    
    return {
      total: trackedItems.length,
      active: trackedItems.filter(item => item.is_active).length,
      paused: trackedItems.filter(item => !item.is_active).length,
      products: trackedItems.filter(item => item.item_type === 'produto').length,
      fuels: trackedItems.filter(item => item.item_type === 'combustivel').length
    }
  }, [trackedItems])

  if (isLoading) {
    return <TrackedItemsSkeleton />
  }

  if (error) {
    return (
      <div className="space-y-6">
        <TrackedItemsHeader
          totalItems={0}
          activeItems={0}
          pausedItems={0}
          totalProducts={0}
          totalFuels={0}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          filterBy={filterBy}
          onFilterChange={setFilterBy}
          sortBy={sortBy}
          onSortChange={setSortBy}
        />
        
        <div className="rounded-lg border border-error/20 bg-error/5 p-8 text-center">
          <p className="text-error font-medium mb-2">Erro ao carregar itens monitorados</p>
          <p className="text-muted-foreground text-body-sm">{error.message}</p>
        </div>
      </div>
    )
  }

  if (!trackedItems || trackedItems.length === 0) {
    return (
      <div className="space-y-6">
        <TrackedItemsHeader
          totalItems={0}
          activeItems={0}
          pausedItems={0}
          totalProducts={0}
          totalFuels={0}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          filterBy={filterBy}
          onFilterChange={setFilterBy}
          sortBy={sortBy}
          onSortChange={setSortBy}
        />
        
        <TrackedItemsEmpty 
          onAddProduct={handleAddProduct}
          onAddFuel={handleAddFuel}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <TrackedItemsHeader
        totalItems={stats.total}
        activeItems={stats.active}
        pausedItems={stats.paused}
        totalProducts={stats.products}
        totalFuels={stats.fuels}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filterBy={filterBy}
        onFilterChange={setFilterBy}
        sortBy={sortBy}
        onSortChange={setSortBy}
      />

      {filteredAndSortedItems.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground text-body-lg">
            Nenhum item encontrado com os filtros aplicados.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedItems.map((item, index) => (
            <div 
              key={item.id} 
              className="animate-fade-in-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <TrackedItemCard
                item={item}
                onToggle={handleToggleItem}
                onDelete={handleDeleteItem}
                isToggling={toggleMutation.isPending}
                isDeleting={deleteMutation.isPending}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
