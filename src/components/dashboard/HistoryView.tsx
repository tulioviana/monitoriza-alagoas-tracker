import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useHistory, useHistoryStats, type HistoryFilters } from '@/hooks/useHistory'
import { formatCurrency, formatExactDateTime, formatCnpj } from '@/lib/dateUtils'
import { 
  History, 
  Download, 
  Filter, 
  TrendingUp, 
  TrendingDown, 
  Package, 
  Fuel,
  Building2,
  Calendar
} from 'lucide-react'

export function HistoryView() {
  const [filters, setFilters] = useState<HistoryFilters>({
    itemType: 'all'
  })

  const { data: historyData = [], isLoading } = useHistory(filters)
  const { data: stats } = useHistoryStats()

  const handleFilterChange = (key: keyof HistoryFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === '' ? undefined : value
    }))
  }

  const exportToCSV = () => {
    if (!historyData.length) return

    const headers = [
      'Item Monitorado',
      'Descrição',
      'Estabelecimento',
      'CNPJ',
      'Tipo',
      'Preço Declarado',
      'Preço Encontrado',
      'Diferença',
      'Data da Venda',
      'Data da Coleta'
    ]

    const csvData = historyData.map(item => [
      item.tracked_item_nickname,
      item.product_description,
      item.establishment_name,
      formatCnpj(item.establishment_cnpj),
      item.item_type === 'produto' ? 'Produto' : 'Combustível',
      item.declared_price ? formatCurrency(item.declared_price) : 'N/A',
      formatCurrency(item.sale_price),
      item.price_difference ? formatCurrency(item.price_difference) : 'N/A',
      formatExactDateTime(item.sale_date),
      formatExactDateTime(item.fetch_date)
    ])

    const csv = [headers, ...csvData].map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `historico-precos-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const getPriceDifferenceColor = (difference: number | null | undefined) => {
    if (!difference) return 'secondary'
    return difference > 0 ? 'error' : 'secondary'
  }

  const getPriceDifferenceIcon = (difference: number | null | undefined) => {
    if (!difference || Math.abs(difference) < 0.01) return null
    return difference > 0 ? TrendingUp : TrendingDown
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-8 bg-muted rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-muted rounded"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <History className="w-6 h-6" />
          Histórico Completo
        </h1>
        <p className="text-muted-foreground">
          Visualize todo o histórico de preços coletados
        </p>
      </div>

      {/* Estatísticas */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <History className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total de Registros</p>
                  <p className="text-2xl font-bold">{stats.totalRecords}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Package className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Produtos</p>
                  <p className="text-2xl font-bold">{stats.productRecords}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Fuel className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Combustíveis</p>
                  <p className="text-2xl font-bold">{stats.fuelRecords}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Diferença Média</p>
                  <p className="text-2xl font-bold">{formatCurrency(stats.avgPriceDifference)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label htmlFor="date-from">Data Inicial</Label>
              <Input
                id="date-from"
                type="date"
                value={filters.dateFrom || ''}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="date-to">Data Final</Label>
              <Input
                id="date-to"
                type="date"
                value={filters.dateTo || ''}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="item-type">Tipo de Item</Label>
              <Select value={filters.itemType || 'all'} onValueChange={(value) => handleFilterChange('itemType', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="produto">Produtos</SelectItem>
                  <SelectItem value="combustivel">Combustíveis</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="establishment">Estabelecimento</Label>
              <Input
                id="establishment"
                placeholder="Nome do estabelecimento..."
                value={filters.establishment || ''}
                onChange={(e) => handleFilterChange('establishment', e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-between items-center mt-4">
            <Button
              variant="outline"
              onClick={() => setFilters({ itemType: 'all' })}
            >
              Limpar Filtros
            </Button>
            
            <Button
              onClick={exportToCSV}
              disabled={!historyData.length}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Exportar CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Dados */}
      <Card>
        <CardHeader>
          <CardTitle>Dados do Histórico ({historyData.length} registros)</CardTitle>
        </CardHeader>
        <CardContent>
          {historyData.length === 0 ? (
            <div className="text-center py-12">
              <History className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum registro encontrado</h3>
              <p className="text-muted-foreground">
                Ajuste os filtros ou aguarde a coleta de novos dados
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Estabelecimento</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Preço Declarado</TableHead>
                    <TableHead>Preço Encontrado</TableHead>
                    <TableHead>Diferença</TableHead>
                    <TableHead>Data da Venda</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyData.map((item) => {
                    const DifferenceIcon = getPriceDifferenceIcon(item.price_difference)
                    
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          {item.tracked_item_nickname}
                        </TableCell>
                        <TableCell className="max-w-xs truncate" title={item.product_description}>
                          {item.product_description}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{item.establishment_name}</div>
                            <div className="text-xs text-muted-foreground">
                              {formatCnpj(item.establishment_cnpj)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="flex items-center gap-1 w-fit">
                            {item.item_type === 'produto' ? (
                              <Package className="w-3 h-3" />
                            ) : (
                              <Fuel className="w-3 h-3" />
                            )}
                            {item.item_type === 'produto' ? 'Produto' : 'Combustível'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {item.declared_price ? formatCurrency(item.declared_price) : 'N/A'}
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(item.sale_price)}
                        </TableCell>
                        <TableCell>
                          {item.price_difference !== null && item.price_difference !== undefined ? (
                            <Badge 
                              variant={getPriceDifferenceColor(item.price_difference)}
                              className="flex items-center gap-1 w-fit"
                            >
                              {DifferenceIcon && <DifferenceIcon className="w-3 h-3" />}
                              {formatCurrency(item.price_difference)}
                            </Badge>
                          ) : (
                            'N/A'
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="w-3 h-3 text-muted-foreground" />
                            {formatExactDateTime(item.sale_date)}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}