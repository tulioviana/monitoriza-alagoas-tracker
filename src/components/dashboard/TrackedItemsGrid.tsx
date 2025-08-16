import React, { useState, useMemo } from 'react'
import { PlanGate } from '@/components/ui/plan-gate'
import { Bell, Plus, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { TrackedItemCard } from './TrackedItemCard'
import { TrackedItemsFilter, FilterType, SortOption, ViewMode } from './TrackedItemsFilter'
import { useTrackedItems } from '@/hooks/useTrackedItems'
import { useManualPriceUpdate } from '@/hooks/useManualPriceUpdate'
import { usePlan } from '@/contexts/PlanContext'
import { useNavigate } from 'react-router-dom'
import { TrackedItem } from '@/hooks/useTrackedItems'

export function TrackedItemsGrid() {
  const { trackedItems, isLoading, isError, error } = useTrackedItems()
  const { executeManualUpdate, isExecuting, cooldownTimeLeft, canExecute } = useManualPriceUpdate()
  const { isPro } = usePlan()
  const navigate = useNavigate()
  
  // Filter and sort states
  const [filter, setFilter] = useState<FilterType>('all')
  const [sortBy, setSortBy] = useState<SortOption>('name')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  
  // Defensive check to ensure trackedItems is always an array
  const safeTrackedItems = Array.isArray(trackedItems) ? trackedItems : []
  
  // Filter, search, and sort logic
  const filteredAndSortedItems = useMemo(() => {
    let items = [...safeTrackedItems]
    
    // Apply status filter
    if (filter === 'active') {
      items = items.filter(item => item.is_active)
    } else if (filter === 'paused') {
      items = items.filter(item => !item.is_active)
    }
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      items = items.filter(item => 
        item.nickname.toLowerCase().includes(query) ||
        item.establishment_name?.toLowerCase().includes(query) ||
        item.establishment_cnpj?.includes(query)
      )
    }
    
    // Apply sorting
    items.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.nickname.localeCompare(b.nickname)
        case 'price':
          return (b.last_price || 0) - (a.last_price || 0)
        case 'date':
          return new Date(b.last_updated_at || 0).getTime() - new Date(a.last_updated_at || 0).getTime()
        case 'establishment':
          return (a.establishment_name || '').localeCompare(b.establishment_name || '')
        default:
          return 0
      }
    })
    
    return items
  }, [safeTrackedItems, filter, sortBy, searchQuery])
  
  // Counts for filter badges
  const counts = useMemo(() => {
    const activeCount = safeTrackedItems.filter(item => item.is_active).length
    const pausedCount = safeTrackedItems.filter(item => !item.is_active).length
    return {
      total: safeTrackedItems.length,
      active: activeCount,
      paused: pausedCount
    }
  }, [safeTrackedItems])
  
  const handleReset = () => {
    setFilter('all')
    setSortBy('name')
    setSearchQuery('')
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-start">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-8 w-8 rounded" />
              </div>
              <Skeleton className="h-4 w-1/2" />
              <div className="flex justify-between items-center">
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-6 w-16" />
              </div>
              <Skeleton className="h-12 w-full" />
              <div className="space-y-1">
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (isError) {
    console.error('TrackedItemsGrid error:', error);
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-destructive space-y-4">
            <div>Erro ao carregar itens monitorados. Tente recarregar a página.</div>
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()}
              className="mt-4"
            >
              Recarregar Página
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (safeTrackedItems.length === 0) {
    return (
      <div className="relative">
        {/* Animated background gradient */}
        <div className="absolute inset-0 bg-gradient-primary opacity-5 rounded-2xl animate-pulse"></div>
        
        <Card className="relative bg-gradient-surface border-primary/20 shadow-strong border-2">
          <CardContent className="p-16">
            <div className="text-center space-y-8 animate-fade-in">
              {/* Animated icon with glow effect */}
              <div className="relative mx-auto w-32 h-32">
                <div className="absolute inset-0 bg-gradient-primary rounded-full opacity-20 animate-pulse"></div>
                <div className="relative w-32 h-32 bg-gradient-secondary rounded-full flex items-center justify-center shadow-strong">
                  <Bell className="h-16 w-16 text-primary animate-bounce" style={{ animationDelay: '1s' }} />
                </div>
                {/* Decorative rings */}
                <div className="absolute -inset-4 border-2 border-primary/20 rounded-full animate-ping"></div>
                <div className="absolute -inset-2 border border-primary/10 rounded-full animate-ping" style={{ animationDelay: '0.5s' }}></div>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-display-lg font-bold bg-gradient-primary bg-clip-text text-transparent">
                  Seu Centro de Monitoramento Inteligente
                </h3>
                <p className="text-body-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                  🎯 Transforme-se em um especialista em preços! Monitore produtos e combustíveis em tempo real, 
                  receba alertas instantâneos de variações e nunca mais perca uma oportunidade de economia.
                </p>
                
                {/* Feature highlights */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 max-w-4xl mx-auto">
                  <div className="p-4 bg-gradient-success-active/10 rounded-lg border border-green-500/20">
                    <div className="text-2xl mb-2">📊</div>
                    <h4 className="font-semibold text-green-700 dark:text-green-300">Análise Inteligente</h4>
                    <p className="text-sm text-muted-foreground">Gráficos e tendências automáticas</p>
                  </div>
                  <div className="p-4 bg-gradient-primary/10 rounded-lg border border-primary/20">
                    <div className="text-2xl mb-2">⚡</div>
                    <h4 className="font-semibold text-primary">Alertas em Tempo Real</h4>
                    <p className="text-sm text-muted-foreground">Notificações instantâneas de mudanças</p>
                  </div>
                  <div className="p-4 bg-gradient-warning-paused/10 rounded-lg border border-yellow-500/20">
                    <div className="text-2xl mb-2">💰</div>
                    <h4 className="font-semibold text-yellow-700 dark:text-yellow-300">Economia Garantida</h4>
                    <p className="text-sm text-muted-foreground">Encontre sempre o melhor preço</p>
                  </div>
                </div>
              </div>

              {/* Enhanced CTAs */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                <Button 
                  onClick={() => navigate('/?tab=products')} 
                  size="lg"
                  className="bg-gradient-primary hover:scale-105 transition-all duration-300 shadow-strong text-lg font-bold min-w-[200px]"
                >
                  <Plus className="mr-3 h-5 w-5" />
                  Buscar Produtos
                  <span className="ml-2 text-xs bg-white/20 rounded-full px-2 py-1">Popular</span>
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/?tab=fuels')} 
                  size="lg"
                  className="border-2 border-primary/30 hover:bg-primary/10 hover:scale-105 transition-all duration-300 text-lg font-semibold min-w-[200px]"
                >
                  <Plus className="mr-3 h-5 w-5" />
                  Buscar Combustíveis
                </Button>
              </div>
              
              {/* Engagement hint */}
              <div className="mt-8 p-4 bg-info/10 rounded-lg border border-info/20 max-w-md mx-auto">
                <p className="text-sm text-info font-medium">
                  💡 Dica: Comece monitorando 3-5 produtos que você compra frequentemente para ver resultados imediatos!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <PlanGate feature="monitored">
      <div className="space-y-6">
      {/* Filter Controls and General Update Button */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <TrackedItemsFilter
          filter={filter}
          sortBy={sortBy}
          viewMode={viewMode}
          searchQuery={searchQuery}
          activeCount={counts.active}
          pausedCount={counts.paused}
          totalCount={counts.total}
          onFilterChange={setFilter}
          onSortChange={setSortBy}
          onViewModeChange={setViewMode}
          onSearchChange={setSearchQuery}
          onReset={handleReset}
        />
        
        {/* Botão de Atualização Geral - apenas para usuários Pro */}
        {isPro && safeTrackedItems.length > 0 && (
          <Button
            onClick={executeManualUpdate}
            disabled={isExecuting || !canExecute}
            variant="outline"
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isExecuting ? 'animate-spin' : ''}`} />
            {isExecuting ? 'Atualizando...' : 'Atualização Geral'}
            {!canExecute && !isExecuting && (
              <span className="text-xs text-muted-foreground ml-1">
                ({cooldownTimeLeft}s)
              </span>
            )}
          </Button>
        )}
      </div>
      
      {/* Results Summary */}
      {filteredAndSortedItems.length !== safeTrackedItems.length && (
        <div className="flex items-center justify-between bg-muted/30 rounded-lg p-3">
          <span className="text-sm text-muted-foreground">
            Mostrando {filteredAndSortedItems.length} de {safeTrackedItems.length} itens
          </span>
          {(filter !== 'all' || searchQuery.trim()) && (
            <Button variant="ghost" size="sm" onClick={handleReset}>
              Mostrar todos
            </Button>
          )}
        </div>
      )}
      
      {/* Items Grid/List */}
      <div className={
        viewMode === 'grid' 
          ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          : "space-y-4"
      }>
        {filteredAndSortedItems.map((item, index) => (
          <div 
            key={item.id} 
            className="animate-fade-in-up"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <TrackedItemCard item={item} viewMode={viewMode} />
          </div>
        ))}
      </div>
      
      {/* No Results */}
      {filteredAndSortedItems.length === 0 && safeTrackedItems.length > 0 && (
        <Card className="bg-muted/30">
          <CardContent className="p-8 text-center">
            <div className="text-muted-foreground space-y-2">
              <div className="text-lg font-medium">Nenhum item encontrado</div>
              <div className="text-sm">
                Tente ajustar os filtros ou buscar por termos diferentes.
              </div>
            </div>
            <Button variant="outline" onClick={handleReset} className="mt-4">
              Limpar filtros
            </Button>
          </CardContent>
        </Card>
      )}
      </div>
    </PlanGate>
  )
}