import { useState } from 'react'
import { PlanGate } from '@/components/ui/plan-gate'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useMarketIntelligence } from '@/hooks/useMarketIntelligence'
import { BarChart, LineChart, PieChart, TrendingUp, TrendingDown, Building2, DollarSign, Calendar, Download, AlertTriangle } from 'lucide-react'
import { Loading } from '@/components/ui/loading'
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { CompetitorAnalysis } from './CompetitorAnalysis'

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
    <PlanGate feature="market-intelligence">
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
          <TabsTrigger value="competitors">Concorrentes</TabsTrigger>
          <TabsTrigger value="opportunities">Oportunidades</TabsTrigger>
          <TabsTrigger value="trends">Tendências</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Distribuição por Tipo</CardTitle>
              <CardDescription>Visão geral dos itens monitorados por categoria</CardDescription>
            </CardHeader>
            <CardContent>
              {marketData?.itemTypeDistribution && marketData.itemTypeDistribution.length > 0 ? (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={marketData.itemTypeDistribution.map(item => ({
                          name: item.type === 'product' ? 'Produtos' : 'Combustíveis',
                          value: item.count,
                          percentage: ((item.count / marketData.totalItems) * 100).toFixed(1)
                        }))}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percentage }) => `${name}: ${percentage}%`}
                      >
                        <Cell fill="hsl(var(--primary))" />
                        <Cell fill="hsl(var(--secondary))" />
                      </Pie>
                      <Tooltip 
                        formatter={(value: number, name: string) => [
                          `${value} itens`, 
                          name
                        ]}
                      />
                      <Legend />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center py-12">
                  <PieChart className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Nenhum item monitorado encontrado</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="competitors" className="space-y-4">
          <CompetitorAnalysis period={period} itemType={itemType} />
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
    </PlanGate>
  )
}