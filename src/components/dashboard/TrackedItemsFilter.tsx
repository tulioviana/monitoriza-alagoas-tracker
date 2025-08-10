import React from 'react'
import { Search, Filter, SortAsc, Grid3X3, List, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export type FilterType = 'all' | 'active' | 'paused'
export type SortOption = 'name' | 'price' | 'date' | 'establishment'
export type ViewMode = 'grid' | 'list'

interface TrackedItemsFilterProps {
  // Filter states
  filter: FilterType
  sortBy: SortOption
  viewMode: ViewMode
  searchQuery: string
  
  // Counts
  activeCount: number
  pausedCount: number
  totalCount: number
  
  // Handlers
  onFilterChange: (filter: FilterType) => void
  onSortChange: (sort: SortOption) => void
  onViewModeChange: (mode: ViewMode) => void
  onSearchChange: (query: string) => void
  onReset: () => void
}

export function TrackedItemsFilter({
  filter,
  sortBy,
  viewMode,
  searchQuery,
  activeCount,
  pausedCount,
  totalCount,
  onFilterChange,
  onSortChange,
  onViewModeChange,
  onSearchChange,
  onReset
}: TrackedItemsFilterProps) {
  return (
    <Card className="mb-6 bg-gradient-surface border-primary/10">
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Top Row: Search and Reset */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou estabelecimento..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10 bg-white/80 border-primary/20 focus:border-primary"
              />
            </div>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onReset}
              className="hover:bg-primary/10"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Limpar Filtros
            </Button>
          </div>

          {/* Filter Toggles with Counts */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Status:</span>
            </div>
            
            <ToggleGroup
              type="single"
              value={filter}
              onValueChange={(value) => value && onFilterChange(value as FilterType)}
              className="bg-white/50 rounded-lg p-1"
            >
              <ToggleGroupItem value="all" variant="outline" className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                Todos
                <Badge variant="secondary" className="ml-2 bg-gray-100 text-gray-700">
                  {totalCount}
                </Badge>
              </ToggleGroupItem>
              <ToggleGroupItem value="active" variant="outline" className="data-[state=on]:bg-success data-[state=on]:text-success-foreground">
                Ativos
                <Badge variant="secondary" className="ml-2 bg-green-100 text-green-700">
                  {activeCount}
                </Badge>
              </ToggleGroupItem>
              <ToggleGroupItem value="paused" variant="outline" className="data-[state=on]:bg-warning data-[state=on]:text-warning-foreground">
                Pausados
                <Badge variant="secondary" className="ml-2 bg-yellow-100 text-yellow-700">
                  {pausedCount}
                </Badge>
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          {/* Bottom Row: Sort and View Mode */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between pt-2 border-t border-border/50">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <SortAsc className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Ordenar por:</span>
              </div>
              
              <Select value={sortBy} onValueChange={(value) => onSortChange(value as SortOption)}>
                <SelectTrigger className="w-48 bg-white/80 border-primary/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Nome (A-Z)</SelectItem>
                  <SelectItem value="price">Preço (Maior-Menor)</SelectItem>
                  <SelectItem value="date">Data (Mais Recente)</SelectItem>
                  <SelectItem value="establishment">Estabelecimento (A-Z)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Visualização:</span>
              <ToggleGroup
                type="single"
                value={viewMode}
                onValueChange={(value) => value && onViewModeChange(value as ViewMode)}
                className="bg-white/50 rounded-lg p-1"
              >
                <ToggleGroupItem value="grid" variant="outline" size="sm">
                  <Grid3X3 className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="list" variant="outline" size="sm">
                  <List className="h-4 w-4" />
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}