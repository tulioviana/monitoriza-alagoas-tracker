import { TrackedItemCard } from './TrackedItemCard'
import { TrackedItemWithPrice } from '@/hooks/useTrackedItems'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Monitor } from 'lucide-react'

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
    <Card className="h-full animate-pulse bg-gradient-to-br from-card to-muted/30 relative overflow-hidden">
      {/* Indicador de status no topo */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-primary/30 rounded-t-lg" />
      
      <CardHeader className="pb-3 relative mt-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-4 rounded-full" />
          </div>
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <Skeleton className="h-10 w-32" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        
        <div className="space-y-3 pt-4 border-t border-border/50">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-4 w-32 flex-1" />
          </div>
          
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-12 rounded-full" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
      </CardContent>
    </Card>
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
      <div className="text-center py-16">
        <div className="mx-auto w-32 h-32 bg-gradient-to-br from-primary/10 to-primary/5 rounded-full flex items-center justify-center mb-6 shadow-soft">
          <Monitor className="w-16 h-16 text-primary/60" />
        </div>
        <h3 className="text-xl font-semibold mb-3 text-foreground">Nenhum item encontrado</h3>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto leading-relaxed">
          Não encontramos itens com os filtros aplicados. Que tal adicionar seu primeiro item para monitoramento?
        </p>
        <div className="inline-flex items-center justify-center px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium shadow-soft hover:shadow-medium transition-all duration-200 hover:scale-105">
          Adicionar Primeiro Item
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {items.map((item, index) => (
        <div
          key={item.id}
          className="animate-fade-in-up"
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <TrackedItemCard
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
        </div>
      ))}
    </div>
  )
}