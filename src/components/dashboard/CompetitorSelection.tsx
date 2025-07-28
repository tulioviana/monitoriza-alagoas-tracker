import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Building2, Package, TrendingDown, TrendingUp, Minus, Check, X } from "lucide-react";
import { EstablishmentWithProducts, useCompetitorManagement } from "@/hooks/useCompetitorManagement";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CompetitorSelectionProps {
  establishments: EstablishmentWithProducts[];
  isCompetitorSelected: (cnpj: string) => boolean;
  isProductSelected: (cnpj: string, productId: number) => boolean;
  toggleCompetitor: (cnpj: string) => void;
  toggleProduct: (cnpj: string, productId: number) => void;
  selectAllProducts: (cnpj: string) => void;
  selectedCompetitors: any[];
}

export function CompetitorSelection({
  establishments,
  isCompetitorSelected,
  isProductSelected,
  toggleCompetitor,
  toggleProduct,
  selectAllProducts,
  selectedCompetitors
}: CompetitorSelectionProps) {
  
  const getPriceTrendIcon = (trend: string | null) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-3 w-3 text-red-500" />;
      case 'down':
        return <TrendingDown className="h-3 w-3 text-green-500" />;
      case 'stable':
        return <Minus className="h-3 w-3 text-yellow-500" />;
      default:
        return <Minus className="h-3 w-3 text-muted-foreground" />;
    }
  };

  const formatPrice = (price: number | null) => {
    if (!price) return 'N/A';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const getSelectedProductsCount = (cnpj: string) => {
    const competitor = selectedCompetitors.find(c => c.cnpj === cnpj);
    return competitor?.selectedProducts.length || 0;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Gerenciamento de Concorrentes</h3>
          <p className="text-sm text-muted-foreground">
            Selecione até 5 concorrentes e seus produtos para análise comparativa
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            {selectedCompetitors.length}/5 concorrentes selecionados
          </Badge>
        </div>
      </div>

      <div className="grid gap-4">
        {establishments.map((establishment) => {
          const isSelected = isCompetitorSelected(establishment.cnpj);
          const selectedProductsCount = getSelectedProductsCount(establishment.cnpj);
          
          return (
            <Card key={establishment.cnpj} className={isSelected ? "ring-2 ring-primary" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleCompetitor(establishment.cnpj)}
                      disabled={!isSelected && selectedCompetitors.length >= 5}
                      className="mt-1"
                    />
                    <div className="space-y-1">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        {establishment.nome_fantasia || establishment.razao_social}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        CNPJ: {establishment.cnpj}
                      </CardDescription>
                      {establishment.nome_fantasia && (
                        <CardDescription className="text-xs">
                          {establishment.razao_social}
                        </CardDescription>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="flex items-center gap-2 text-sm">
                      <Package className="h-3 w-3" />
                      <span>{establishment.total_products} produtos monitorados</span>
                    </div>
                    {establishment.last_update && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Última atualização: {formatDistanceToNow(new Date(establishment.last_update), { 
                          addSuffix: true, 
                          locale: ptBR 
                        })}
                      </p>
                    )}
                  </div>
                </div>
              </CardHeader>

              {isSelected && (
                <CardContent className="pt-0">
                  <Separator className="mb-4" />
                  
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium">
                      Produtos para Análise ({selectedProductsCount}/{establishment.total_products})
                    </h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => selectAllProducts(establishment.cnpj)}
                      className="h-7"
                    >
                      <Check className="h-3 w-3 mr-1" />
                      Selecionar Todos
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {establishment.monitored_products.map((product) => (
                      <div
                        key={product.tracked_item_id}
                        className="flex items-center justify-between p-2 border rounded-md hover:bg-muted/50"
                      >
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={isProductSelected(establishment.cnpj, product.tracked_item_id)}
                            onCheckedChange={() => toggleProduct(establishment.cnpj, product.tracked_item_id)}
                          />
                          <div>
                            <p className="text-sm font-medium">{product.nickname}</p>
                            <p className="text-xs text-muted-foreground">
                              Tipo: {product.item_type}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3 text-right">
                          <div>
                            <p className="text-sm font-medium">
                              {formatPrice(product.latest_price)}
                            </p>
                            {product.last_update && (
                              <p className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(product.last_update), { 
                                  addSuffix: true, 
                                  locale: ptBR 
                                })}
                              </p>
                            )}
                          </div>
                          {getPriceTrendIcon(product.price_trend)}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {establishments.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum concorrente encontrado</h3>
            <p className="text-sm text-muted-foreground">
              Você precisa ter produtos monitorados para que os concorrentes apareçam aqui.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}