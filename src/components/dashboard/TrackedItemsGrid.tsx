import { TrackedItemCard } from './TrackedItemCard'
import { TrackedItemWithPrice } from '@/hooks/useTrackedItems'
import { Skeleton } from '@/components/ui/skeleton'

interface TrackedItemsGridProps {
  items: TrackedItemWithPrice[]
  onToggleItem: (id: number, currentStatus: boolean) => void
  onDeleteItem: (id: number) => void
  isLoading?: boolean
  toggleMutationState?: { isPending: boolean; variables?: any }
  deleteMutationState?: { isPending: boolean; variables?: any }
}

function TrackedItemSkeleton() {
  return (
    <div className="border rounded-lg p-6 space-y-4">
      <div className="flex justify-between items-start">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-8 w-8 rounded" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-5 w-32" />
      </div>
      <div className="space-y-2 pt-2 border-t">
        <div className="flex gap-2">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="flex justify-between">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
    </div>
  )
}

export function TrackedItemsGrid({
  items,
  onToggleItem,
  onDeleteItem,
  isLoading = false,
  toggleMutationState,
  deleteMutationState
}: TrackedItemsGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <TrackedItemSkeleton key={index} />
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
          <div className="w-12 h-12 bg-muted-foreground/20 rounded-lg"></div>
        </div>
        <h3 className="text-lg font-semibold mb-2">Nenhum item encontrado</h3>
        <p className="text-muted-foreground mb-6">
          Não encontramos itens com os filtros aplicados.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {items.map((item) => (
        <TrackedItemCard
          key={item.id}
          item={item}
          onToggle={onToggleItem}
          onDelete={onDeleteItem}
          isToggling={
            toggleMutationState?.isPending && 
            toggleMutationState?.variables?.id === item.id
          }
          isDeleting={
            deleteMutationState?.isPending && 
            deleteMutationState?.variables === item.id
          }
        />
      ))}
    </div>
  )
}