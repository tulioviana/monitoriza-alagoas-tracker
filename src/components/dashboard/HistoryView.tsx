
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  History, 
  TrendingUp, 
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Filter
} from 'lucide-react'
import { useHistoryData } from '@/hooks/useHistoryData'

export function HistoryView() {
  const [currentPage, setCurrentPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const { data, isLoading } = useHistoryData(currentPage, 20)

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'price_update':
        return <TrendingUp className="w-4 h-4" />
      case 'item_added':
        return <Plus className="w-4 h-4" />
      default:
        return <History className="w-4 h-4" />
    }
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'price_update':
        return 'bg-blue-500'
      case 'item_added':
        return 'bg-green-500'
      default:
        return 'bg-gray-500'
    }
  }

  const formatDateTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('pt-BR')
  }

  const filteredItems = data?.items?.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = typeFilter === 'all' || item.type === typeFilter
    return matchesSearch && matchesType
  }) || []

  const totalPages = Math.ceil((data?.total || 0) / 20)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <History className="w-5 h-5" />
              Histórico de Atividades
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-start gap-3 p-4 rounded-lg animate-pulse">
                  <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <History className="w-5 h-5" />
            Histórico de Atividades
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filtros */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Buscar no histórico..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filtrar por tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="price_update">Preços atualizados</SelectItem>
                <SelectItem value="item_added">Itens adicionados</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Lista de atividades */}
          <div className="space-y-3">
            {filteredItems.length === 0 ? (
              <div className="text-center py-12">
                <History className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhuma atividade encontrada</h3>
                <p className="text-muted-foreground">
                  Tente ajustar os filtros ou buscar por outros termos
                </p>
              </div>
            ) : (
              filteredItems.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 p-4 rounded-lg border hover:bg-muted/50 transition-colors">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className={`${getActivityColor(activity.type)} text-white text-xs`}>
                      {getActivityIcon(activity.type)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-foreground">
                          {activity.title}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {activity.description}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-muted-foreground">
                            {formatDateTime(activity.timestamp)}
                          </span>
                          {activity.price && (
                            <Badge variant="secondary" className="text-xs">
                              R$ {activity.price.toFixed(2)}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-muted-foreground">
                Página {currentPage} de {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Próxima
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
