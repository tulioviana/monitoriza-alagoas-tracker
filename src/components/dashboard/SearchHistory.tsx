import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trash2, RotateCcw, Search, Fuel, Package, MapPin, Building } from 'lucide-react';
import { useSearchHistory, SearchHistoryEntry } from '@/hooks/useSearchHistory';
import { formatExactDateTime } from '@/lib/dateUtils';
import { getFuelTypeName, getMunicipalityName } from '@/lib/constants';

interface SearchHistoryProps {
  onNavigateToSearch?: (tabType: 'products' | 'fuels', searchCriteria: any) => void;
}

export function SearchHistory({ onNavigateToSearch }: SearchHistoryProps) {
  const { searchHistory, isLoading, deleteSearch } = useSearchHistory();

  const handleReExecuteSearch = (entry: SearchHistoryEntry) => {
    if (onNavigateToSearch) {
      const tabType = entry.item_type === 'produto' ? 'products' : 'fuels';
      onNavigateToSearch(tabType, entry.search_criteria);
    }
  };

  const productHistory = searchHistory.filter(item => item.item_type === 'produto');
  const fuelHistory = searchHistory.filter(item => item.item_type === 'combustivel');

  const renderSearchCriteria = (criteria: any, itemType: string) => {
    const criteriaItems = [];

    // Tipo de combustível (apenas para combustíveis)
    if (itemType === 'combustivel' && criteria.produto?.tipoCombustivel) {
      criteriaItems.push({
        icon: <Fuel className="h-3 w-3" />,
        label: 'Combustível',
        value: getFuelTypeName(criteria.produto.tipoCombustivel)
      });
    }

    // GTIN (apenas para produtos)
    if (itemType === 'produto' && criteria.produto?.gtin) {
      criteriaItems.push({
        icon: <Package className="h-3 w-3" />,
        label: 'GTIN',
        value: criteria.produto.gtin
      });
    }

    // Descrição (apenas para produtos)
    if (itemType === 'produto' && criteria.produto?.descricao) {
      criteriaItems.push({
        icon: <Package className="h-3 w-3" />,
        label: 'Descrição',
        value: criteria.produto.descricao
      });
    }

    // Município
    if (criteria.estabelecimento?.municipio?.codigoIBGE) {
      criteriaItems.push({
        icon: <MapPin className="h-3 w-3" />,
        label: 'Município',
        value: getMunicipalityName(criteria.estabelecimento.municipio.codigoIBGE)
      });
    }

    // CNPJ
    if (criteria.estabelecimento?.individual?.cnpj) {
      criteriaItems.push({
        icon: <Building className="h-3 w-3" />,
        label: 'CNPJ',
        value: criteria.estabelecimento.individual.cnpj
      });
    }

    // Localização (latitude/longitude)
    if (criteria.estabelecimento?.geolocalizacao?.latitude && criteria.estabelecimento?.geolocalizacao?.longitude) {
      criteriaItems.push({
        icon: <MapPin className="h-3 w-3" />,
        label: 'Localização',
        value: `${criteria.estabelecimento.geolocalizacao.latitude}, ${criteria.estabelecimento.geolocalizacao.longitude}`
      });
    }

    // Raio (apenas para geolocalização)
    if (criteria.estabelecimento?.geolocalizacao?.raio) {
      criteriaItems.push({
        icon: <MapPin className="h-3 w-3" />,
        label: 'Raio',
        value: `${criteria.estabelecimento.geolocalizacao.raio} km`
      });
    }

    // Período
    if (criteria.dias) {
      criteriaItems.push({
        icon: <Search className="h-3 w-3" />,
        label: 'Período',
        value: `Últimos ${criteria.dias} dias`
      });
    }

    return criteriaItems;
  };

  const renderHistoryItem = (entry: SearchHistoryEntry) => {
    const searchCriteria = renderSearchCriteria(entry.search_criteria, entry.item_type);

    return (
      <Card key={entry.id} className="mb-4">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                {entry.item_type === 'produto' ? (
                  <Package className="h-4 w-4 text-blue-600" />
                ) : (
                  <Fuel className="h-4 w-4 text-amber-600" />
                )}
                <Badge variant="outline" className="font-medium">
                  {entry.item_type === 'produto' ? 'Produto' : 'Combustível'}
                </Badge>
              </div>
              
              <div className="space-y-3">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-foreground">Critérios de busca</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {searchCriteria.map((item, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
                        {item.icon}
                        <span className="text-xs font-medium text-muted-foreground">{item.label}:</span>
                        <span className="text-xs text-foreground">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <p className="text-xs text-muted-foreground">
                  Pesquisado em {formatExactDateTime(entry.searched_at)}
                </p>
              </div>
            </div>
            
            <div className="flex gap-2 ml-4">
              <Button
                size="sm"
                onClick={() => handleReExecuteSearch(entry)}
                className="flex items-center gap-1"
              >
                <RotateCcw className="h-4 w-4" />
                Re-executar
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                onClick={() => deleteSearch(entry.id)}
                className="flex items-center gap-1"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              <CardTitle>Histórico de Buscas</CardTitle>
            </div>
            <CardDescription>
              Suas pesquisas anteriores por produtos e combustíveis
            </CardDescription>
          </CardHeader>
        </Card>

        {searchHistory.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhuma busca encontrada</h3>
              <p className="text-muted-foreground">
                Suas pesquisas por produtos e combustíveis aparecerão aqui.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">Todas ({searchHistory.length})</TabsTrigger>
              <TabsTrigger value="produtos">Produtos ({productHistory.length})</TabsTrigger>
              <TabsTrigger value="combustiveis">Combustíveis ({fuelHistory.length})</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="space-y-4">
              {searchHistory.map(renderHistoryItem)}
            </TabsContent>
            
            <TabsContent value="produtos" className="space-y-4">
              {productHistory.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <Package className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">Nenhuma busca por produtos encontrada.</p>
                  </CardContent>
                </Card>
              ) : (
                productHistory.map(renderHistoryItem)
              )}
            </TabsContent>
            
            <TabsContent value="combustiveis" className="space-y-4">
              {fuelHistory.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <Fuel className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">Nenhuma busca por combustíveis encontrada.</p>
                  </CardContent>
                </Card>
              ) : (
                fuelHistory.map(renderHistoryItem)
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>

    </>
  );
}