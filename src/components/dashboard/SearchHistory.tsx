import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trash2, Plus, Search, Fuel, Package } from 'lucide-react';
import { useSearchHistory, SearchHistoryEntry } from '@/hooks/useSearchHistory';
import { useTrackedItems } from '@/hooks/useTrackedItems';
import { formatRelativeTime, formatCnpj } from '@/lib/dateUtils';
import { AddToMonitoringModal } from './AddToMonitoringModal';

export function SearchHistory() {
  const { searchHistory, isLoading, deleteSearch } = useSearchHistory();
  const { trackedItems } = useTrackedItems();
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleAddToMonitoring = (entry: SearchHistoryEntry) => {
    // Com a nova estrutura otimizada, o usuário poderá re-executar a busca
    setSelectedItem({
      item_type: entry.item_type,
      search_criteria: entry.search_criteria,
      establishment_cnpj: '', // Será preenchido após nova busca
      establishment_name: '', // Será preenchido após nova busca
      sale_price: 0, // Valor padrão
    });
    setIsModalOpen(true);
  };

  const productHistory = searchHistory.filter(item => item.item_type === 'produto');
  const fuelHistory = searchHistory.filter(item => item.item_type === 'combustivel');

  const renderHistoryItem = (entry: SearchHistoryEntry) => {

    return (
      <Card key={entry.id} className="mb-4">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                {entry.item_type === 'produto' ? (
                  <Package className="h-4 w-4" />
                ) : (
                  <Fuel className="h-4 w-4" />
                )}
                <Badge variant="outline">
                  {entry.item_type === 'produto' ? 'Produto' : 'Combustível'}
                </Badge>
              </div>
              
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">
                  <strong>Critérios de busca:</strong>
                  <div className="mt-1 p-2 bg-muted rounded text-xs space-y-1">
                    {Object.entries(entry.search_criteria).map(([key, value]) => (
                      <div key={key}>
                        <strong>{key}:</strong> {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </div>
                    ))}
                  </div>
                </div>
                
                <p className="text-xs text-muted-foreground">
                  Pesquisado {formatRelativeTime(entry.searched_at)}
                </p>
              </div>
            </div>
            
            <div className="flex gap-2 ml-4">
              <Button
                size="sm"
                onClick={() => handleAddToMonitoring(entry)}
                className="flex items-center gap-1"
              >
                <Plus className="h-4 w-4" />
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

      {selectedItem && (
        <AddToMonitoringModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedItem(null);
          }}
          itemType={selectedItem.item_type}
          searchCriteria={selectedItem.search_criteria}
          establishmentCnpj={selectedItem.establishment_cnpj}
          establishmentName={selectedItem.establishment_name}
          suggestedName={`${selectedItem.item_type === 'produto' ? 'Produto' : 'Combustível'} do Histórico`}
        />
      )}
    </>
  );
}