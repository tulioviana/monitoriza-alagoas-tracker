import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { 
  Monitor, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Search, 
  Filter, 
  SortAsc,
  Eye,
  Pause,
  Package,
  Fuel
} from 'lucide-react'

interface TrackedItemsHeaderProps {
  totalItems: number
  activeItems: number
  pausedItems: number
  totalProducts: number
  totalFuels: number
  searchTerm: string
  onSearchChange: (value: string) => void
  filterBy: string
  onFilterChange: (value: string) => void
  sortBy: string
  onSortChange: (value: string) => void
}

export function TrackedItemsHeader({
  totalItems,
  activeItems,
  pausedItems,
  totalProducts,
  totalFuels,
  searchTerm,
  onSearchChange,
  filterBy,
  onFilterChange,
  sortBy,
  onSortChange
}: TrackedItemsHeaderProps) {
  const economyEstimate = 127.50 // Valor fictício para demonstração

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card className="hover-lift">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Monitor className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-body-xs text-muted-foreground">Total</p>
                <p className="text-display-sm font-bold">{totalItems}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <Eye className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-body-xs text-muted-foreground">Ativos</p>
                <p className="text-display-sm font-bold text-success">{activeItems}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <Pause className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-body-xs text-muted-foreground">Pausados</p>
                <p className="text-display-sm font-bold text-warning">{pausedItems}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-info/10">
                <Package className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="text-body-xs text-muted-foreground">Produtos</p>
                <p className="text-display-sm font-bold text-info">{totalProducts}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-secondary/80">
                <Fuel className="h-5 w-5 text-secondary-foreground" />
              </div>
              <div>
                <p className="text-body-xs text-muted-foreground">Combustíveis</p>
                <p className="text-display-sm font-bold">{totalFuels}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-primary">
                <DollarSign className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <p className="text-body-xs text-muted-foreground">Economia</p>
                <p className="text-display-sm font-bold text-success">R$ {economyEstimate.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-3 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar itens monitorados..."
                  value={searchTerm}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="flex gap-2">
                <Select value={filterBy} onValueChange={onFilterChange}>
                  <SelectTrigger className="w-40">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="active">Ativos</SelectItem>
                    <SelectItem value="paused">Pausados</SelectItem>
                    <SelectItem value="produto">Produtos</SelectItem>
                    <SelectItem value="combustivel">Combustíveis</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={onSortChange}>
                  <SelectTrigger className="w-48">
                    <SortAsc className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="updated">Última atualização</SelectItem>
                    <SelectItem value="name">Nome (A-Z)</SelectItem>
                    <SelectItem value="savings">Maior economia</SelectItem>
                    <SelectItem value="price-increase">Maiores altas</SelectItem>
                    <SelectItem value="price-decrease">Maiores quedas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2">
              <Badge variant="outline" className="text-body-xs">
                <TrendingUp className="h-3 w-3 mr-1 text-success" />
                3 em alta
              </Badge>
              <Badge variant="outline" className="text-body-xs">
                <TrendingDown className="h-3 w-3 mr-1 text-error" />
                2 em queda
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}