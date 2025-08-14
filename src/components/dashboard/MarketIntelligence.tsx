import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useMarketIntelligence } from '@/hooks/useMarketIntelligence'
import { BarChart, LineChart, PieChart, TrendingUp, TrendingDown, Building2, DollarSign, Calendar, Download, AlertTriangle } from 'lucide-react'
import { Loading } from '@/components/ui/loading'

export function MarketIntelligence() {
  const [period, setPeriod] = useState('30')
  const [itemType, setItemType] = useState('all')
  
  const { 
    data: marketData, 
    isLoading, 
    error,
    refetch 
  } = useMarketIntelligence({ period, itemType })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="h-4 bg-muted animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted animate-pulse rounded mb-2" />
                <div className="h-3 bg-muted animate-pulse rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Loading.Spinner />
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <AlertTriangle className="w-8 h-8 text-destructive mx-auto mb-2" />
            <p className="text-muted-foreground">Erro ao carregar dados de inteligência</p>
            <Button onClick={() => refetch()} className="mt-2">Tentar novamente</Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="flex gap-4 items-center">
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Últimos 7 dias</SelectItem>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
            <SelectItem value="90">Últimos 90 dias</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={itemType} onValueChange={setItemType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Tipo de item" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="product">Produtos</SelectItem>
            <SelectItem value="fuel">Combustíveis</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" className="ml-auto">
          <Download className="w-4 h-4 mr-2" />
          Exportar Relatório
        </Button>
      </div>

      {/* Cards de Métricas */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estabelecimentos Analisados</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{marketData?.totalEstablishments || 0}</div>
            <p className="text-xs text-muted-foreground">
              +{marketData?.newEstablishments || 0} novos este período
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Economia Potencial</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              R$ {marketData?.potentialSavings?.toFixed(2) || '0,00'}
            </div>
            <p className="text-xs text-muted-foreground">
              Comparando com preços médios
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Variação Média</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {marketData?.avgPriceVariation >= 0 ? '+' : ''}{marketData?.avgPriceVariation?.toFixed(1) || '0,0'}%
            </div>
            <p className="text-xs text-muted-foreground">
              Em relação ao período anterior
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Conteúdo Principal */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="competitors">Análise Competitiva</TabsTrigger>
          <TabsTrigger value="opportunities">Oportunidades</TabsTrigger>
          <TabsTrigger value="trends">Tendências</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Distribuição por Tipo</CardTitle>
                <CardDescription>Análise dos itens monitorados</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {marketData?.itemTypeDistribution?.map((item: any) => (
                    <div key={item.type} className="flex items-center justify-between">
                      <span className="text-sm">{item.type === 'product' ? 'Produtos' : 'Combustíveis'}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{item.count}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {((item.count / marketData.totalItems) * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  )) || []}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resumo Executivo</CardTitle>
                <CardDescription>Principais insights do período</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2">📊 Análise de Preços</h4>
                    <p className="text-sm text-muted-foreground">
                      Foram analisados {marketData?.totalItems || 0} itens em {marketData?.totalEstablishments || 0} estabelecimentos, 
                      identificando uma economia potencial de R$ {marketData?.potentialSavings?.toFixed(2) || '0,00'}.
                    </p>
                  </div>
                  
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2">🎯 Principais Oportunidades</h4>
                    <p className="text-sm text-muted-foreground">
                      {marketData?.topOpportunities?.length || 0} oportunidades de economia significativa foram identificadas.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="competitors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Análise Competitiva</CardTitle>
              <CardDescription>Compare preços entre estabelecimentos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <BarChart className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Em Desenvolvimento</h3>
                <p className="text-muted-foreground">
                  Análise detalhada de concorrentes será implementada em breve
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="opportunities" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Oportunidades de Economia</CardTitle>
              <CardDescription>Identifique onde você pode economizar mais</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <TrendingDown className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Em Desenvolvimento</h3>
                <p className="text-muted-foreground">
                  Ranking de oportunidades será implementado em breve
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tendências de Mercado</CardTitle>
              <CardDescription>Acompanhe a evolução dos preços ao longo do tempo</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <LineChart className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Em Desenvolvimento</h3>
                <p className="text-muted-foreground">
                  Gráficos de tendências serão implementados em breve
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}