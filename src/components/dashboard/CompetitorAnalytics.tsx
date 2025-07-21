import React from 'react'
import { useAllCompetitorPrices, useCompetitorTracking } from '@/hooks/useCompetitorTracking'
import { useTrackedItems } from '@/hooks/useTrackedItems'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { TrendingUp, TrendingDown, Activity, Users } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface PriceComparison {
  product: string
  myPrice?: number
  competitorPrice: number
  competitorName: string
  difference: number
  differencePercent: number
}

interface TrendData {
  date: string
  price: number
  competitor: string
}

export function CompetitorAnalytics() {
  const { data: competitorPrices, isLoading: loadingPrices } = useAllCompetitorPrices()
  const { data: competitors, isLoading: loadingCompetitors } = useCompetitorTracking()
  const { data: trackedItems, isLoading: loadingItems } = useTrackedItems()

  if (loadingPrices || loadingCompetitors || loadingItems) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    )
  }

  const activeCompetitors = competitors?.filter(c => c.is_active) || []
  const totalProducts = competitorPrices?.length || 0
  
  // Análise de comparação de preços
  const priceComparisons: PriceComparison[] = []
  
  if (competitorPrices && trackedItems) {
    competitorPrices.forEach(cp => {
      const competitorInfo = activeCompetitors.find(c => c.id === cp.competitor_tracking_id)
      if (!competitorInfo) return

      // Tentar encontrar produto similar nos itens rastreados
      const similarItem = trackedItems.find(item => {
        if (item.item_type === 'produto') {
          const criteria = item.search_criteria as any
          return criteria?.descricao?.toLowerCase().includes(cp.product_description.toLowerCase()) ||
                 cp.product_description.toLowerCase().includes(criteria?.descricao?.toLowerCase())
        }
        return false
      })

      if (similarItem) {
        // Buscar último preço do item rastreado (seria necessário implementar)
        priceComparisons.push({
          product: cp.product_description,
          competitorPrice: Number(cp.sale_price),
          competitorName: competitorInfo.competitor_name || competitorInfo.competitor_cnpj,
          difference: 0, // Calculado quando temos o preço próprio
          differencePercent: 0
        })
      }
    })
  }

  // Dados para gráfico de tendências
  const trendData: TrendData[] = competitorPrices?.map(cp => {
    const competitor = activeCompetitors.find(c => c.id === cp.competitor_tracking_id)
    return {
      date: format(new Date(cp.sale_date), 'dd/MM'),
      price: Number(cp.sale_price),
      competitor: competitor?.competitor_name || competitor?.competitor_cnpj || 'Desconhecido'
    }
  }).slice(0, 20) || []

  // Dados para gráfico de barras (produtos mais caros/baratos por concorrente)
  const competitorAvgPrices = activeCompetitors.map(competitor => {
    const prices = competitorPrices?.filter(cp => cp.competitor_tracking_id === competitor.id) || []
    const avgPrice = prices.length > 0 
      ? prices.reduce((sum, p) => sum + Number(p.sale_price), 0) / prices.length
      : 0
    
    return {
      name: competitor.competitor_name || competitor.competitor_cnpj.slice(-6),
      avgPrice: Number(avgPrice.toFixed(2)),
      products: prices.length
    }
  }).filter(c => c.avgPrice > 0)

  const chartConfig = {
    price: {
      label: "Preço",
      color: "hsl(var(--primary))",
    },
    avgPrice: {
      label: "Preço Médio",
      color: "hsl(var(--secondary))",
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Análise Competitiva</h2>
        <p className="text-muted-foreground">
          Insights e tendências baseados nos dados coletados dos concorrentes
        </p>
      </div>

      {/* Métricas Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Concorrentes Ativos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCompetitors.length}</div>
            <p className="text-xs text-muted-foreground">
              Monitoramento ativo
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Produtos Coletados</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProducts}</div>
            <p className="text-xs text-muted-foreground">
              Últimas 24 horas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Preço Médio Geral</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {competitorPrices && competitorPrices.length > 0 
                ? (competitorPrices.reduce((sum, p) => sum + Number(p.sale_price), 0) / competitorPrices.length).toFixed(2)
                : '0,00'
              }
            </div>
            <p className="text-xs text-muted-foreground">
              Média dos concorrentes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Oportunidades</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{priceComparisons.length}</div>
            <p className="text-xs text-muted-foreground">
              Produtos para análise
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Tendências de Preços */}
        <Card>
          <CardHeader>
            <CardTitle>Tendência de Preços</CardTitle>
            <CardDescription>
              Evolução dos preços coletados dos concorrentes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <ChartTooltip 
                    content={<ChartTooltipContent />}
                    formatter={(value: any, name: string) => [
                      `R$ ${Number(value).toFixed(2)}`,
                      'Preço'
                    ]}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="price" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Gráfico de Preços Médios por Concorrente */}
        <Card>
          <CardHeader>
            <CardTitle>Preços Médios por Concorrente</CardTitle>
            <CardDescription>
              Comparação dos preços médios entre concorrentes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={competitorAvgPrices}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <ChartTooltip 
                    content={<ChartTooltipContent />}
                    formatter={(value: any, name: string) => [
                      `R$ ${Number(value).toFixed(2)}`,
                      'Preço Médio'
                    ]}
                  />
                  <Bar 
                    dataKey="avgPrice" 
                    fill="hsl(var(--secondary))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Produtos dos Concorrentes */}
      {competitorPrices && competitorPrices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Produtos Coletados Recentemente</CardTitle>
            <CardDescription>
              Últimos produtos encontrados nos concorrentes monitorados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {competitorPrices.slice(0, 10).map((item, index) => {
                const competitor = activeCompetitors.find(c => c.id === item.competitor_tracking_id)
                return (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{item.product_description}</div>
                      <div className="text-xs text-muted-foreground">
                        {competitor?.competitor_name || competitor?.competitor_cnpj}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(item.sale_date), 'dd/MM/yyyy', { locale: ptBR })}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg">R$ {Number(item.sale_price).toFixed(2)}</div>
                      {item.declared_price && (
                        <div className="text-xs text-muted-foreground">
                          Declarado: R$ {Number(item.declared_price).toFixed(2)}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}