import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { ChevronDown, ChevronUp, Bug, Database, Activity } from "lucide-react";

interface AnalysisDebugPanelProps {
  selectedCompetitors: any[];
  analysisActive: boolean;
  productComparisons: any[];
  loading: boolean;
}

export function AnalysisDebugPanel({ 
  selectedCompetitors, 
  analysisActive, 
  productComparisons, 
  loading 
}: AnalysisDebugPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const totalSelectedProducts = selectedCompetitors.reduce((sum, c) => sum + (c.selectedProducts?.length || 0), 0);

  return (
    <Card className="border-2 border-orange-200 bg-orange-50/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Bug className="h-4 w-4 text-orange-600" />
            Debug Panel - Análise Comparativa
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-6 w-6 p-0"
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="pt-0 space-y-4">
          {/* Status Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Estado da Análise</p>
              <Badge variant={analysisActive ? "default" : "secondary"}>
                {analysisActive ? "Ativo" : "Inativo"}
              </Badge>
            </div>
            
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Concorrentes</p>
              <Badge variant="outline">
                {selectedCompetitors.length}
              </Badge>
            </div>
            
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Produtos Selecionados</p>
              <Badge variant="outline">
                {totalSelectedProducts}
              </Badge>
            </div>
            
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Status</p>
              <Badge variant={loading ? "secondary" : "default"}>
                {loading ? "Carregando..." : "Pronto"}
              </Badge>
            </div>
          </div>

          {/* Data Details */}
          <div className="space-y-3">
            <div className="border rounded-lg p-3">
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <Database className="h-4 w-4" />
                Dados dos Concorrentes
              </h4>
              {selectedCompetitors.length > 0 ? (
                <div className="space-y-2">
                  {selectedCompetitors.map((comp, index) => (
                    <div key={comp.cnpj || index} className="text-xs bg-muted/50 p-2 rounded">
                      <div className="flex justify-between">
                        <span className="font-medium">CNPJ: {comp.cnpj || 'N/A'}</span>
                        <span>{comp.selectedProducts?.length || 0} produtos</span>
                      </div>
                      {comp.selectedProducts && comp.selectedProducts.length > 0 && (
                        <div className="mt-1 text-muted-foreground">
                          IDs: [{comp.selectedProducts.slice(0, 5).join(', ')}{comp.selectedProducts.length > 5 ? '...' : ''}]
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Nenhum concorrente selecionado</p>
              )}
            </div>

            <div className="border rounded-lg p-3">
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Resultados da Análise
              </h4>
              {productComparisons.length > 0 ? (
                <div className="space-y-2">
                  {productComparisons.map((comparison, index) => (
                    <div key={comparison.tracked_item_id || index} className="text-xs bg-muted/50 p-2 rounded">
                      <div className="flex justify-between">
                        <span className="font-medium">{comparison.product_name}</span>
                        <span>{comparison.competitors?.length || 0} concorrentes</span>
                      </div>
                      {comparison.insights && (
                        <div className="mt-1 text-muted-foreground">
                          Menor: R$ {comparison.insights.lowest_price?.toFixed(2) || 'N/A'} | 
                          Maior: R$ {comparison.insights.highest_price?.toFixed(2) || 'N/A'}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {loading ? "Carregando dados..." : "Nenhum resultado disponível"}
                </p>
              )}
            </div>
          </div>

          {/* Validation Status */}
          <div className="border rounded-lg p-3 bg-slate-50">
            <h4 className="text-sm font-medium mb-2">Status de Validação</h4>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span>Análise ativa:</span>
                <Badge size="sm" variant={analysisActive ? "default" : "secondary"}>
                  {analysisActive ? "✓" : "✗"}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Concorrentes suficientes (≥2):</span>
                <Badge size="sm" variant={selectedCompetitors.length >= 2 ? "default" : "secondary"}>
                  {selectedCompetitors.length >= 2 ? "✓" : "✗"}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Produtos selecionados (≥1):</span>
                <Badge size="sm" variant={totalSelectedProducts >= 1 ? "default" : "secondary"}>
                  {totalSelectedProducts >= 1 ? "✓" : "✗"}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Dados carregados:</span>
                <Badge size="sm" variant={!loading ? "default" : "secondary"}>
                  {!loading ? "✓" : "⏳"}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}