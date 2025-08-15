import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { useMarketIntelligence } from '@/hooks/useMarketIntelligence'
import { Building2, Package, Fuel, Eye, EyeOff } from 'lucide-react'
import { Loading } from '@/components/ui/loading'

interface CompetitorAnalysisProps {
  period: string
  itemType: string
}

export function CompetitorAnalysis({ period, itemType }: CompetitorAnalysisProps) {
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set())
  const [selectedEstablishment, setSelectedEstablishment] = useState<string | null>(null)
  
  const { data: marketData, isLoading } = useMarketIntelligence({ period, itemType })

  const handleItemToggle = (itemId: number) => {
    const newSelected = new Set(selectedItems)
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId)
    } else {
      newSelected.add(itemId)
    }
    setSelectedItems(newSelected)
  }

  const handleSelectAllItems = (establishmentCnpj: string) => {
    const establishmentItems = marketData?.establishmentItems
      ?.filter(item => item.establishment_cnpj === establishmentCnpj)
      ?.map(item => item.id) || []
    
    const newSelected = new Set(selectedItems)
    const allSelected = establishmentItems.every(id => newSelected.has(id))
    
    if (allSelected) {
      establishmentItems.forEach(id => newSelected.delete(id))
    } else {
      establishmentItems.forEach(id => newSelected.add(id))
    }
    setSelectedItems(newSelected)
  }

  if (isLoading) {
    return <Loading.Spinner />
  }

  if (!marketData?.establishments || marketData.establishments.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum estabelecimento encontrado</h3>
            <p className="text-muted-foreground">
              Adicione itens ao monitoramento para ver a análise competitiva
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Selecionados */}
      {selectedItems.size > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Itens Selecionados para Análise ({selectedItems.size})
            </CardTitle>
            <CardDescription>
              Estes itens serão utilizados nas próximas análises gráficas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Array.from(selectedItems).map(itemId => {
                const item = marketData.establishmentItems?.find(i => i.id === itemId)
                return item ? (
                  <Badge key={itemId} variant="default" className="gap-1">
                    {item.item_type === 'product' ? <Package className="w-3 h-3" /> : <Fuel className="w-3 h-3" />}
                    {item.nickname}
                  </Badge>
                ) : null
              })}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedItems(new Set())}
                className="h-6 px-2 text-xs"
              >
                <EyeOff className="w-3 h-3 mr-1" />
                Limpar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de Estabelecimentos */}
      <div className="grid gap-4">
        {marketData.establishments.map((establishment) => {
          const establishmentItems = marketData.establishmentItems?.filter(
            item => item.establishment_cnpj === establishment.cnpj
          ) || []
          
          const selectedCount = establishmentItems.filter(item => selectedItems.has(item.id)).length
          const allSelected = establishmentItems.length > 0 && selectedCount === establishmentItems.length

          return (
            <Card key={establishment.cnpj} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{establishment.name}</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <Building2 className="w-4 h-4" />
                      CNPJ: {establishment.cnpj}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {establishmentItems.length} {establishmentItems.length === 1 ? 'item' : 'itens'}
                    </Badge>
                    {establishmentItems.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSelectAllItems(establishment.cnpj)}
                      >
                        {allSelected ? 'Desmarcar Todos' : 'Selecionar Todos'}
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              {establishmentItems.length > 0 && (
                <CardContent className="pt-0">
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {establishmentItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center space-x-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                      >
                        <Checkbox
                          id={`item-${item.id}`}
                          checked={selectedItems.has(item.id)}
                          onCheckedChange={() => handleItemToggle(item.id)}
                        />
                        <label
                          htmlFor={`item-${item.id}`}
                          className="flex-1 cursor-pointer space-y-1"
                        >
                          <div className="flex items-center gap-2">
                            {item.item_type === 'product' ? (
                              <Package className="w-4 h-4 text-blue-500" />
                            ) : (
                              <Fuel className="w-4 h-4 text-orange-500" />
                            )}
                            <span className="font-medium text-sm">{item.nickname}</span>
                          </div>
                          {item.last_price && (
                            <div className="text-xs text-muted-foreground">
                              Último preço: R$ {Number(item.last_price).toFixed(2)}
                            </div>
                          )}
                        </label>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}