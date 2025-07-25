import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function TrackedItemsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-9 w-9 rounded-lg" />
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-12" />
                    <Skeleton className="h-5 w-8" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <Skeleton className="h-10 flex-1 max-w-md" />
              <div className="flex gap-2">
                <Skeleton className="h-10 w-40" />
                <Skeleton className="h-10 w-48" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <div className="h-1 bg-muted" />
            
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start gap-3">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-7 w-7 rounded-md" />
                    <Skeleton className="h-6 w-32" />
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-5 w-12 rounded-full" />
                  </div>
                  <div className="flex items-center gap-1">
                    <Skeleton className="h-3 w-3" />
                    <Skeleton className="h-4 w-28" />
                  </div>
                </div>
                <Skeleton className="h-8 w-8 rounded" />
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-8 w-24" />
                      <Skeleton className="h-6 w-12" />
                    </div>
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <div className="text-right space-y-1">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-8" />
                  </div>
                  <Skeleton className="h-2 w-full rounded-full" />
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-3 w-3" />
                  <Skeleton className="h-3 w-40" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-3 w-3" />
                  <Skeleton className="h-3 w-36" />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Skeleton className="h-8 flex-1" />
                <Skeleton className="h-8 w-10" />
                <Skeleton className="h-8 w-10" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}