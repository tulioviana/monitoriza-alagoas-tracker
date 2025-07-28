import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { TrendingUp, TrendingDown, Minus, Building2, Package, AlertTriangle, Target, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CompetitiveAnalysisSelectedProps {
  selectedCompetitors: any[];
  analysisActive?: boolean;
}

interface ProductComparison {
  product_name: string;
  tracked_item_id: number;
  competitors: {
    cnpj: string;
    establishment_name: string;
    current_price: number;
    price_trend: 'up' | 'down' | 'stable';
    last_update: string;
  }[];
  insights: {
    lowest_price: number;
    highest_price: number;
    average_price: number;
    price_spread: number;
    your_position?: 'lowest' | 'highest' | 'middle';
    recommendation: string;
  };
}

interface PriceEvolution {
  date: string;
  [key: string]: any; // Dynamic keys for each competitor
}

export function CompetitiveAnalysisSelected({ selectedCompetitors, analysisActive = false }: CompetitiveAnalysisSelectedProps) {
  const [productComparisons, setProductComparisons] = useState<ProductComparison[]>([]);
  const [priceEvolution, setPriceEvolution] = useState<PriceEvolution[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadAnalysisData = async () => {
    try {
      setLoading(true);
      
      if (selectedCompetitors.length === 0) {
        setProductComparisons([]);
        setPriceEvolution([]);
        return;
      }

      // Get all selected product IDs across all competitors
      const allProductIds = selectedCompetitors.flatMap(c => c.selectedProducts || []);
      const uniqueProductIds = [...new Set(allProductIds)];

      if (uniqueProductIds.length === 0) {
        setProductComparisons([]);
        setPriceEvolution([]);
        return;
      }

      // Fetch price history for selected products and competitors
      const selectedCnpjs = selectedCompetitors.map(c => c.cnpj);
      
      const { data: priceData, error: priceError } = await supabase
        .from('price_history')
        .select(`
          establishment_cnpj,
          tracked_item_id,
          sale_price,
          fetch_date,
          tracked_items!inner(
            id,
            nickname,
            item_type
          )
        `)
        .in('tracked_item_id', uniqueProductIds)
        .in('establishment_cnpj', selectedCnpjs)
        .order('fetch_date', { ascending: false });

      if (priceError) throw priceError;

      // Get establishment details
      const { data: establishmentData, error: establishmentError } = await supabase
        .from('establishments')
        .select('cnpj, razao_social, nome_fantasia')
        .in('cnpj', selectedCnpjs);

      if (establishmentError) throw establishmentError;

      // Process data for product comparisons
      const productMap = new Map<number, ProductComparison>();
      
      priceData?.forEach(item => {
        const productId = item.tracked_item_id;
        const establishment = establishmentData?.find(e => e.cnpj === item.establishment_cnpj);
        
        if (!establishment) return;

        if (!productMap.has(productId)) {
          productMap.set(productId, {
            product_name: item.tracked_items.nickname,
            tracked_item_id: productId,
            competitors: [],
            insights: {
              lowest_price: Infinity,
              highest_price: -Infinity,
              average_price: 0,
              price_spread: 0,
              recommendation: ''
            }
          });
        }

        const product = productMap.get(productId)!;
        
        // Find or add competitor
        let competitor = product.competitors.find(c => c.cnpj === item.establishment_cnpj);
        if (!competitor) {
          competitor = {
            cnpj: item.establishment_cnpj,
            establishment_name: establishment.nome_fantasia || establishment.razao_social,
            current_price: item.sale_price,
            price_trend: 'stable',
            last_update: item.fetch_date
          };
          product.competitors.push(competitor);
        } else {
          // Update if this is a more recent price
          if (item.fetch_date > competitor.last_update) {
            competitor.current_price = item.sale_price;
            competitor.last_update = item.fetch_date;
          }
        }
      });

      // Calculate insights for each product
      const comparisons: ProductComparison[] = [];
      
      for (const [productId, product] of productMap) {
        if (product.competitors.length === 0) continue;

        const prices = product.competitors.map(c => c.current_price);
        const lowest = Math.min(...prices);
        const highest = Math.max(...prices);
        const average = prices.reduce((sum, price) => sum + price, 0) / prices.length;
        const spread = ((highest - lowest) / lowest) * 100;

        // Calculate price trends
        for (const competitor of product.competitors) {
          competitor.price_trend = await calculatePriceTrend(competitor.cnpj, productId);
        }

        product.insights = {
          lowest_price: lowest,
          highest_price: highest,
          average_price: average,
          price_spread: spread,
          recommendation: generateRecommendation(product.competitors, average, spread)
        };

        comparisons.push(product);
      }

      setProductComparisons(comparisons);

      // Generate price evolution data for charts
      await generatePriceEvolution(uniqueProductIds, selectedCnpjs, establishmentData || []);
      
    } catch (error) {
      console.error('Error loading analysis data:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados da análise competitiva.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculatePriceTrend = async (cnpj: string, trackedItemId: number): Promise<'up' | 'down' | 'stable'> => {
    try {
      const { data, error } = await supabase
        .from('price_history')
        .select('sale_price, fetch_date')
        .eq('establishment_cnpj', cnpj)
        .eq('tracked_item_id', trackedItemId)
        .order('fetch_date', { ascending: false })
        .limit(2);

      if (error || !data || data.length < 2) return 'stable';

      const [latest, previous] = data;
      const changePercent = ((latest.sale_price - previous.sale_price) / previous.sale_price) * 100;
      
      if (changePercent > 2) return 'up';
      if (changePercent < -2) return 'down';
      return 'stable';
    } catch {
      return 'stable';
    }
  };

  const generateRecommendation = (competitors: any[], averagePrice: number, priceSpread: number): string => {
    const trendingUp = competitors.filter(c => c.price_trend === 'up').length;
    const trendingDown = competitors.filter(c => c.price_trend === 'down').length;

    if (priceSpread > 20) {
      return "Grande dispersão de preços. Oportunidade para posicionamento estratégico.";
    } else if (trendingUp > trendingDown) {
      return "Tendência de alta nos preços dos concorrentes. Considere ajustes.";
    } else if (trendingDown > trendingUp) {
      return "Concorrentes reduzindo preços. Monitore para manter competitividade.";
    } else {
      return "Preços estáveis no mercado. Mantenha monitoramento contínuo.";
    }
  };

  const generatePriceEvolution = async (productIds: number[], cnpjs: string[], establishments: any[]) => {
    try {
      const { data, error } = await supabase
        .from('price_history')
        .select(`
          establishment_cnpj,
          tracked_item_id,
          sale_price,
          fetch_date
        `)
        .in('tracked_item_id', productIds)
        .in('establishment_cnpj', cnpjs)
        .gte('fetch_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days
        .order('fetch_date', { ascending: true });

      if (error) throw error;

      // Group by date and create evolution data
      const dateMap = new Map<string, any>();
      
      data?.forEach(item => {
        const date = item.fetch_date.split('T')[0]; // Get date only
        const establishment = establishments.find(e => e.cnpj === item.establishment_cnpj);
        const establishmentName = establishment?.nome_fantasia || establishment?.razao_social || item.establishment_cnpj;
        
        if (!dateMap.has(date)) {
          dateMap.set(date, { date });
        }
        
        const dateEntry = dateMap.get(date);
        const key = `${establishmentName}_${item.tracked_item_id}`;
        
        if (!dateEntry[key] || item.fetch_date > dateEntry[`${key}_timestamp`]) {
          dateEntry[key] = item.sale_price;
          dateEntry[`${key}_timestamp`] = item.fetch_date;
        }
      });

      const evolution = Array.from(dateMap.values())
        .map(entry => {
          const cleaned = { ...entry };
          // Remove timestamp fields
          Object.keys(cleaned).forEach(key => {
            if (key.endsWith('_timestamp')) {
              delete cleaned[key];
            }
          });
          return cleaned;
        })
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      setPriceEvolution(evolution);
    } catch (error) {
      console.error('Error generating price evolution:', error);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const getPriceTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-red-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-green-500" />;
      default:
        return <Minus className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getColors = () => ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1'];

  useEffect(() => {
    if (analysisActive) {
      loadAnalysisData();
    }
  }, [selectedCompetitors, analysisActive]);

  if (!analysisActive) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Análise não iniciada</h3>
          <p className="text-sm text-muted-foreground">
            Vá para a aba "Gerenciamento" e clique em "Iniciar Análise" para ativar a análise comparativa.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (selectedCompetitors.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Nenhum concorrente selecionado</h3>
          <p className="text-sm text-muted-foreground">
            Selecione concorrentes e produtos na aba "Gerenciamento" para ver a análise comparativa.
          </p>
        </CardContent>
      </Card>
    );
  }

  const totalSelectedProducts = selectedCompetitors.reduce((sum, c) => sum + (c.selectedProducts?.length || 0), 0);

  if (totalSelectedProducts === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Nenhum produto selecionado</h3>
          <p className="text-sm text-muted-foreground">
            Selecione produtos dos concorrentes escolhidos para ver a análise comparativa.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Análise Comparativa</h3>
          <p className="text-sm text-muted-foreground">
            Análise detalhada dos {selectedCompetitors.length} concorrentes e {totalSelectedProducts} produtos selecionados
          </p>
        </div>
        <Button variant="outline" onClick={loadAnalysisData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {loading ? (
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
      ) : (
        <>
          {/* Price Evolution Chart */}
          {priceEvolution.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Evolução de Preços (Últimos 30 dias)</CardTitle>
                <CardDescription>
                  Acompanhe a evolução dos preços dos produtos selecionados
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={priceEvolution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatPrice(Number(value))} />
                    <Legend />
                    {Object.keys(priceEvolution[0] || {})
                      .filter(key => key !== 'date')
                      .map((key, index) => (
                        <Line
                          key={key}
                          type="monotone"
                          dataKey={key}
                          stroke={getColors()[index % getColors().length]}
                          strokeWidth={2}
                        />
                      ))}
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Product Comparisons */}
          <div className="space-y-4">
            {productComparisons.map((comparison) => (
              <Card key={comparison.tracked_item_id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    {comparison.product_name}
                  </CardTitle>
                  <CardDescription>
                    Comparação entre {comparison.competitors.length} concorrentes
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Insights Summary */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p className="text-xs text-muted-foreground">Menor Preço</p>
                      <p className="font-medium text-green-600">
                        {formatPrice(comparison.insights.lowest_price)}
                      </p>
                    </div>
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p className="text-xs text-muted-foreground">Maior Preço</p>
                      <p className="font-medium text-red-600">
                        {formatPrice(comparison.insights.highest_price)}
                      </p>
                    </div>
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p className="text-xs text-muted-foreground">Preço Médio</p>
                      <p className="font-medium">
                        {formatPrice(comparison.insights.average_price)}
                      </p>
                    </div>
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p className="text-xs text-muted-foreground">Variação</p>
                      <p className="font-medium">
                        {comparison.insights.price_spread.toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  {/* Recommendation */}
                  <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                    <AlertTriangle className="h-4 w-4 text-blue-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                        Recomendação Estratégica
                      </p>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        {comparison.insights.recommendation}
                      </p>
                    </div>
                  </div>

                  {/* Competitor Comparison */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Comparação por Concorrente</h4>
                    {comparison.competitors
                      .sort((a, b) => a.current_price - b.current_price)
                      .map((competitor, index) => (
                        <div key={competitor.cnpj} className="flex items-center justify-between p-2 border rounded-md">
                          <div className="flex items-center gap-2">
                            <Badge variant={index === 0 ? "default" : "secondary"}>
                              {index + 1}º
                            </Badge>
                            <div>
                              <p className="text-sm font-medium">{competitor.establishment_name}</p>
                              <p className="text-xs text-muted-foreground">
                                Atualizado {formatDistanceToNow(new Date(competitor.last_update), { 
                                  addSuffix: true, 
                                  locale: ptBR 
                                })}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {formatPrice(competitor.current_price)}
                            </span>
                            {getPriceTrendIcon(competitor.price_trend)}
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {productComparisons.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhum dado encontrado</h3>
                <p className="text-sm text-muted-foreground">
                  Não foram encontrados dados suficientes para a análise comparativa dos produtos selecionados.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}