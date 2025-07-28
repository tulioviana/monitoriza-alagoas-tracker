import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Target, Award, AlertTriangle, DollarSign, Package, Users, Activity } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface CompetitorAnalyticsDashboardProps {
  selectedCompetitors: any[];
  analysisActive: boolean;
}

interface AnalyticsData {
  marketOverview: {
    totalCompetitors: number;
    totalProducts: number;
    avgPrice: number;
    priceVariation: number;
  };
  competitorRanking: Array<{
    name: string;
    avgPrice: number;
    productCount: number;
    competitivenessScore: number;
    trend: 'up' | 'down' | 'stable';
  }>;
  priceDistribution: Array<{
    range: string;
    count: number;
    percentage: number;
  }>;
  recommendations: string[];
}

export function CompetitorAnalyticsDashboard({ selectedCompetitors, analysisActive }: CompetitorAnalyticsDashboardProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);

  const loadAnalytics = async () => {
    if (!analysisActive || selectedCompetitors.length === 0) return;
    
    try {
      setLoading(true);
      
      // Get all selected product IDs
      const allProductIds = selectedCompetitors.flatMap(c => c.selectedProducts || []);
      const selectedCnpjs = selectedCompetitors.map(c => c.cnpj);
      
      if (allProductIds.length === 0) return;

      // Fetch price data
      const { data: priceData, error } = await supabase
        .from('price_history')
        .select(`
          establishment_cnpj,
          tracked_item_id,
          sale_price,
          fetch_date,
          tracked_items!inner(nickname)
        `)
        .in('tracked_item_id', allProductIds)
        .in('establishment_cnpj', selectedCnpjs)
        .order('fetch_date', { ascending: false });

      if (error) throw error;

      // Get establishment details
      const { data: establishmentData } = await supabase
        .from('establishments')
        .select('cnpj, razao_social, nome_fantasia')
        .in('cnpj', selectedCnpjs);

      // Process analytics data
      const analyticsData = processAnalyticsData(priceData || [], establishmentData || [], selectedCompetitors);
      setAnalytics(analyticsData);

    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const processAnalyticsData = (priceData: any[], establishments: any[], competitors: any[]): AnalyticsData => {
    // Group latest prices by establishment and product
    const latestPrices = new Map();
    
    priceData.forEach(item => {
      const key = `${item.establishment_cnpj}_${item.tracked_item_id}`;
      if (!latestPrices.has(key) || item.fetch_date > latestPrices.get(key).fetch_date) {
        latestPrices.set(key, item);
      }
    });

    const prices = Array.from(latestPrices.values()).map(item => item.sale_price);
    const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceVariation = ((maxPrice - minPrice) / minPrice) * 100;

    // Competitor ranking
    const competitorMap = new Map();
    
    Array.from(latestPrices.values()).forEach(item => {
      const establishment = establishments.find(e => e.cnpj === item.establishment_cnpj);
      const name = establishment?.nome_fantasia || establishment?.razao_social || item.establishment_cnpj;
      
      if (!competitorMap.has(item.establishment_cnpj)) {
        competitorMap.set(item.establishment_cnpj, {
          name,
          prices: [],
          productCount: 0
        });
      }
      
      const competitor = competitorMap.get(item.establishment_cnpj);
      competitor.prices.push(item.sale_price);
      competitor.productCount++;
    });

    const competitorRanking = Array.from(competitorMap.entries()).map(([cnpj, data]) => {
      const avgPrice = data.prices.reduce((sum: number, price: number) => sum + price, 0) / data.prices.length;
      const competitivenessScore = Math.round(((maxPrice - avgPrice) / (maxPrice - minPrice)) * 100);
      
      return {
        name: data.name,
        avgPrice,
        productCount: data.productCount,
        competitivenessScore: Math.min(100, Math.max(0, competitivenessScore)),
        trend: 'stable' as const
      };
    }).sort((a, b) => b.competitivenessScore - a.competitivenessScore);

    // Price distribution
    const ranges = [
      { min: 0, max: 10, label: 'R$ 0-10' },
      { min: 10, max: 25, label: 'R$ 10-25' },
      { min: 25, max: 50, label: 'R$ 25-50' },
      { min: 50, max: 100, label: 'R$ 50-100' },
      { min: 100, max: Infinity, label: 'R$ 100+' }
    ];

    const priceDistribution = ranges.map(range => {
      const count = prices.filter(price => price >= range.min && price < range.max).length;
      return {
        range: range.label,
        count,
        percentage: Math.round((count / prices.length) * 100)
      };
    }).filter(item => item.count > 0);

    // Generate recommendations
    const recommendations = generateRecommendations(competitorRanking, priceVariation, avgPrice);

    // Get all selected product IDs
    const allSelectedProductIds = competitors.flatMap(c => c.selectedProducts || []);
    
    return {
      marketOverview: {
        totalCompetitors: competitors.length,
        totalProducts: allSelectedProductIds.length,
        avgPrice,
        priceVariation
      },
      competitorRanking,
      priceDistribution,
      recommendations
    };
  };

  const generateRecommendations = (ranking: any[], variation: number, avgPrice: number): string[] => {
    const recommendations = [];
    
    if (variation > 30) {
      recommendations.push("Alta variação de preços detectada. Oportunidade para posicionamento estratégico.");
    }
    
    if (ranking.length > 0) {
      const leader = ranking[0];
      recommendations.push(`${leader.name} lidera em competitividade com score de ${leader.competitivenessScore}.`);
    }
    
    if (avgPrice > 50) {
      recommendations.push("Mercado de alto valor. Considere estratégias premium.");
    } else {
      recommendations.push("Mercado competitivo. Foque em eficiência e valor.");
    }
    
    return recommendations;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  useEffect(() => {
    loadAnalytics();
  }, [selectedCompetitors, analysisActive]);

  if (!analysisActive) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Analytics não disponível</h3>
          <p className="text-sm text-muted-foreground">
            Ative a análise na aba "Gerenciamento" para ver o dashboard analytics.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (loading || !analytics) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-muted rounded w-1/3"></div>
                <div className="h-8 bg-muted rounded"></div>
                <div className="h-32 bg-muted rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Market Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Concorrentes</p>
                <p className="text-2xl font-bold">{analytics.marketOverview.totalCompetitors}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Package className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Produtos</p>
                <p className="text-2xl font-bold">{analytics.marketOverview.totalProducts}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Preço Médio</p>
                <p className="text-2xl font-bold">{formatPrice(analytics.marketOverview.avgPrice)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm text-muted-foreground">Variação</p>
                <p className="text-2xl font-bold">{analytics.marketOverview.priceVariation.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Competitor Ranking */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Ranking de Competitividade
          </CardTitle>
          <CardDescription>
            Classificação baseada em preços e variedade de produtos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.competitorRanking}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip 
                formatter={(value, name) => {
                  if (name === 'competitivenessScore') return [`${value}%`, 'Score de Competitividade'];
                  if (name === 'avgPrice') return [formatPrice(Number(value)), 'Preço Médio'];
                  return [value, name];
                }}
              />
              <Legend />
              <Bar dataKey="competitivenessScore" fill="#8884d8" name="Score %" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Price Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Distribuição de Preços</CardTitle>
            <CardDescription>Como os preços estão distribuídos no mercado</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={analytics.priceDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ range, percentage }) => `${range} (${percentage}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {analytics.priceDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Recomendações Estratégicas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.recommendations.map((recommendation, index) => (
                <div key={index} className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-sm text-blue-900 dark:text-blue-100">{recommendation}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}