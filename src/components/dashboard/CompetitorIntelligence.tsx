import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Cell, PieChart, Pie } from 'recharts'
import { TrendingUp, TrendingDown, Target, AlertTriangle, Activity, DollarSign, Users, Award } from "lucide-react"
import { formatCurrency, formatRelativeTime } from "@/lib/dateUtils"
import { useCompetitorIntelligence, useProductCompetitiveAnalysis, usePriceMovements } from "@/hooks/useCompetitorIntelligence"
import { useCompetitorManagement } from "@/hooks/useCompetitorManagement"
import { CompetitorSelection } from "./CompetitorSelection"
import { CompetitiveAnalysisSelected } from "./CompetitiveAnalysisSelected"
import { Skeleton } from "@/components/ui/skeleton"

export function CompetitorIntelligence() {
  const { data: intelligence, isLoading: intelligenceLoading } = useCompetitorIntelligence()
  const { data: productAnalysis, isLoading: productLoading } = useProductCompetitiveAnalysis()
  const { data: priceMovements, isLoading: movementsLoading } = usePriceMovements(7)
  const {
    establishments,
    selectedCompetitors,
    analysisActive,
    loading: managementLoading,
    toggleCompetitor,
    toggleProduct,
    selectAllProducts,
    isCompetitorSelected,
    isProductSelected,
    getTotalSelectedProducts,
    startAnalysis,
    stopAnalysis,
    canStartAnalysis,
    getSelectedCompetitorsWithProducts
  } = useCompetitorManagement()

  if (intelligenceLoading || productLoading || movementsLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  const competitorProfiles = intelligence?.competitorProfiles || []
  const totalCompetitors = intelligence?.totalCompetitors || 0
  const totalProducts = intelligence?.totalMonitoredProducts || 0

  // Calculate summary metrics
  const avgMarketPrice = competitorProfiles.reduce((sum, comp) => sum + comp.avg_price, 0) / competitorProfiles.length || 0
  const mostVolatileCompetitor = competitorProfiles.reduce((prev, current) => 
    (current.price_volatility > prev.price_volatility) ? current : prev, competitorProfiles[0])
  const mostConsistentCompetitor = competitorProfiles.reduce((prev, current) => 
    (current.consistency_score > prev.consistency_score) ? current : prev, competitorProfiles[0])

  // Prepare chart data
  const competitorComparisonData = competitorProfiles.map(comp => ({
    name: comp.establishment_name.substring(0, 20),
    avgPrice: comp.avg_price,
    volatility: comp.price_volatility * 100,
    consistency: comp.consistency_score,
    marketShare: comp.market_share
  }))

  // Radar chart data for competitive positioning
  const radarData = competitorProfiles.slice(0, 5).map(comp => ({
    competitor: comp.establishment_name.substring(0, 15),
    precoMedio: (comp.avg_price / avgMarketPrice) * 100,
    consistencia: comp.consistency_score,
    participacao: comp.market_share * 2, // Scale for visibility
    atividade: Math.min(100, comp.total_products * 10)
  }))

  // Price positioning data
  const positioningData = [
    { name: 'Baixo', value: competitorProfiles.filter(c => c.pricing_position === 'low').length, color: '#22c55e' },
    { name: 'Médio', value: competitorProfiles.filter(c => c.pricing_position === 'medium').length, color: '#f59e0b' },
    { name: 'Alto', value: competitorProfiles.filter(c => c.pricing_position === 'high').length, color: '#ef4444' }
  ]

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Concorrentes Identificados</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCompetitors}</div>
            <p className="text-xs text-muted-foreground">
              {totalProducts} produtos monitorados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Preço Médio do Mercado</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(avgMarketPrice)}</div>
            <p className="text-xs text-muted-foreground">
              Baseado em {competitorProfiles.length} concorrentes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mais Volátil</CardTitle>
            <TrendingUp className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold">{mostVolatileCompetitor?.establishment_name.substring(0, 20)}</div>
            <p className="text-xs text-muted-foreground">
              {(mostVolatileCompetitor?.price_volatility * 100).toFixed(1)}% volatilidade
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mais Consistente</CardTitle>
            <Award className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold">{mostConsistentCompetitor?.establishment_name.substring(0, 20)}</div>
            <p className="text-xs text-muted-foreground">
              {mostConsistentCompetitor?.consistency_score.toFixed(0)}% consistência
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="management">Gerenciamento</TabsTrigger>
          <TabsTrigger value="analysis">Análise Comparativa</TabsTrigger>
          <TabsTrigger value="movements">Movimentações</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Competitor Profiles */}
            <Card>
              <CardHeader>
                <CardTitle>Perfil dos Concorrentes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {competitorProfiles.map((competitor, index) => (
                  <div key={competitor.establishment_cnpj} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{competitor.establishment_name}</h4>
                      <Badge variant={
                        competitor.pricing_position === 'low' ? 'secondary' :
                        competitor.pricing_position === 'high' ? 'error' : 'default'
                      }>
                        {competitor.pricing_position === 'low' ? 'Preço Baixo' :
                         competitor.pricing_position === 'high' ? 'Preço Alto' : 'Preço Médio'}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Preço Médio:</span>
                        <p className="font-medium">{formatCurrency(competitor.avg_price)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Produtos:</span>
                        <p className="font-medium">{competitor.total_products}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Consistência</span>
                        <span>{competitor.consistency_score.toFixed(0)}%</span>
                      </div>
                      <Progress value={competitor.consistency_score} className="h-2" />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Participação</span>
                        <span>{competitor.market_share.toFixed(1)}%</span>
                      </div>
                      <Progress value={competitor.market_share} className="h-2" />
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Última atividade: {formatRelativeTime(competitor.last_activity)}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Positioning Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Posicionamento de Preços</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={positioningData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {positioningData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="management" className="space-y-6">
          {managementLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="animate-pulse space-y-2">
                      <div className="h-4 bg-muted rounded w-1/3"></div>
                      <div className="h-8 bg-muted rounded"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <CompetitorSelection
              establishments={establishments}
              isCompetitorSelected={isCompetitorSelected}
              isProductSelected={isProductSelected}
              toggleCompetitor={toggleCompetitor}
              toggleProduct={toggleProduct}
              selectAllProducts={selectAllProducts}
              selectedCompetitors={selectedCompetitors}
              analysisActive={analysisActive}
              startAnalysis={startAnalysis}
              stopAnalysis={stopAnalysis}
              canStartAnalysis={canStartAnalysis}
              getTotalSelectedProducts={getTotalSelectedProducts}
            />
          )}
        </TabsContent>

        <TabsContent value="analysis" className="space-y-6">
          <CompetitiveAnalysisSelected 
            selectedCompetitors={selectedCompetitors}
            analysisActive={analysisActive}
          />
        </TabsContent>

        <TabsContent value="movements" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Movimentações Recentes de Preços</CardTitle>
              <p className="text-sm text-muted-foreground">
                Últimos 7 dias - Apenas mudanças significativas (≥5%)
              </p>
            </CardHeader>
            <CardContent>
              {priceMovements && priceMovements.length > 0 ? (
                <div className="space-y-4">
                  {priceMovements.map((movement, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {movement.change_percentage > 0 ? (
                            <TrendingUp className="h-4 w-4 text-destructive" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-success" />
                          )}
                          <span className="font-medium">{movement.establishment_name}</span>
                          <Badge variant={
                            movement.impact === 'high' ? 'error' :
                            movement.impact === 'medium' ? 'default' : 'secondary'
                          }>
                            {movement.impact === 'high' ? 'Alto Impacto' :
                             movement.impact === 'medium' ? 'Médio Impacto' : 'Baixo Impacto'}
                          </Badge>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {formatRelativeTime(movement.date)}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Produto:</span>
                          <p className="font-medium">{movement.product_description}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Preço Anterior:</span>
                          <p className="font-medium">{formatCurrency(movement.old_price)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Preço Atual:</span>
                          <p className="font-medium">{formatCurrency(movement.new_price)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Variação:</span>
                          <p className={`font-medium ${movement.change_percentage > 0 ? 'text-destructive' : 'text-success'}`}>
                            {movement.change_percentage > 0 ? '+' : ''}{movement.change_percentage.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-8 w-8 mx-auto mb-2" />
                  <p>Nenhuma movimentação significativa nos últimos 7 dias</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Strategic Insights */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Insights Estratégicos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Price Gap Opportunities */}
                {competitorProfiles.length > 1 && (
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-success" />
                      Oportunidades de Precificação
                    </h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Spread de preços no mercado: {formatCurrency(Math.max(...competitorProfiles.map(c => c.max_price)) - Math.min(...competitorProfiles.map(c => c.min_price)))}
                    </p>
                    <Badge variant="secondary">
                      Margem para ajuste estratégico
                    </Badge>
                  </div>
                )}

                {/* Volatility Alert */}
                {mostVolatileCompetitor && mostVolatileCompetitor.price_volatility > 0.2 && (
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-warning" />
                      Alerta de Volatilidade
                    </h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      {mostVolatileCompetitor.establishment_name} apresenta alta volatilidade ({(mostVolatileCompetitor.price_volatility * 100).toFixed(1)}%)
                    </p>
                    <Badge variant="outline">
                      Monitorar mudanças frequentes
                    </Badge>
                  </div>
                )}

                {/* Market Share Insights */}
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-2">Concentração de Mercado</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Top 3 concorrentes controlam {competitorProfiles.slice(0, 3).reduce((sum, c) => sum + c.market_share, 0).toFixed(1)}% dos produtos monitorados
                  </p>
                  <Badge variant="default">
                    Análise de concentração
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle>Recomendações Estratégicas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Pricing Strategy */}
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-2">Estratégia de Preços</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Monitorar {mostVolatileCompetitor?.establishment_name} por mudanças rápidas</li>
                    <li>• Benchmarking contra {mostConsistentCompetitor?.establishment_name} (mais estável)</li>
                    <li>• Preço médio do mercado: {formatCurrency(avgMarketPrice)}</li>
                  </ul>
                </div>

                {/* Monitoring Focus */}
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-2">Foco de Monitoramento</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Ampliar monitoramento dos principais competidores</li>
                    <li>• Acompanhar tendências semanais de preços</li>
                    <li>• Analisar padrões sazonais</li>
                  </ul>
                </div>

                {/* Competitive Actions */}
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-2">Ações Competitivas</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Identificar produtos com maior potencial</li>
                    <li>• Analisar gaps de mercado</li>
                    <li>• Monitorar entrada de novos competidores</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}