import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface EstablishmentWithProducts {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string | null;
  monitored_products: MonitoredProduct[];
  total_products: number;
  last_update: string | null;
}

export interface MonitoredProduct {
  tracked_item_id: number;
  nickname: string;
  item_type: string;
  search_criteria: any;
  latest_price: number | null;
  price_trend: 'up' | 'down' | 'stable' | null;
  last_update: string | null;
}

export interface CompetitorSelection {
  cnpj: string;
  selectedProducts: number[]; // tracked_item_ids
}

const STORAGE_KEY = 'competitor_selections';
const ANALYSIS_STORAGE_KEY = 'competitor_analysis_state';

export function useCompetitorManagement() {
  const [establishments, setEstablishments] = useState<EstablishmentWithProducts[]>([]);
  const [selectedCompetitors, setSelectedCompetitors] = useState<CompetitorSelection[]>([]);
  const [analysisActive, setAnalysisActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Load selections and analysis state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setSelectedCompetitors(JSON.parse(saved));
      } catch (error) {
        console.error('Error loading saved selections:', error);
      }
    }

    const savedAnalysis = localStorage.getItem(ANALYSIS_STORAGE_KEY);
    if (savedAnalysis) {
      try {
        setAnalysisActive(JSON.parse(savedAnalysis));
      } catch (error) {
        console.error('Error loading saved analysis state:', error);
      }
    }
  }, []);

  // Save selections to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedCompetitors));
  }, [selectedCompetitors]);

  // Save analysis state to localStorage
  useEffect(() => {
    localStorage.setItem(ANALYSIS_STORAGE_KEY, JSON.stringify(analysisActive));
  }, [analysisActive]);

  // Fetch establishments with monitored products
  const fetchEstablishments = async () => {
    try {
      setLoading(true);
      
      // Get all establishments that have price history (indicating they have monitored products)
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
            item_type,
            search_criteria,
            user_id
          )
        `)
        .eq('tracked_items.user_id', (await supabase.auth.getUser()).data.user?.id)
        .order('fetch_date', { ascending: false });

      if (priceError) throw priceError;

      // Group by establishment and get latest data
      const establishmentMap = new Map<string, {
        products: Map<number, MonitoredProduct>;
        lastUpdate: string | null;
      }>();

      priceData?.forEach((item) => {
        const cnpj = item.establishment_cnpj;
        const trackedItem = item.tracked_items;
        
        if (!establishmentMap.has(cnpj)) {
          establishmentMap.set(cnpj, {
            products: new Map(),
            lastUpdate: null
          });
        }

        const establishment = establishmentMap.get(cnpj)!;
        
        // Update last update time
        if (!establishment.lastUpdate || item.fetch_date > establishment.lastUpdate) {
          establishment.lastUpdate = item.fetch_date;
        }

        // Add or update product
        if (!establishment.products.has(trackedItem.id)) {
          establishment.products.set(trackedItem.id, {
            tracked_item_id: trackedItem.id,
            nickname: trackedItem.nickname,
            item_type: trackedItem.item_type,
            search_criteria: trackedItem.search_criteria,
            latest_price: item.sale_price,
            price_trend: null, // Will calculate later
            last_update: item.fetch_date
          });
        } else {
          const product = establishment.products.get(trackedItem.id)!;
          if (item.fetch_date > product.last_update!) {
            product.latest_price = item.sale_price;
            product.last_update = item.fetch_date;
          }
        }
      });

      // Get establishment details
      const cnpjs = Array.from(establishmentMap.keys());
      const { data: establishmentData, error: establishmentError } = await supabase
        .from('establishments')
        .select('cnpj, razao_social, nome_fantasia')
        .in('cnpj', cnpjs);

      if (establishmentError) throw establishmentError;

      // Calculate price trends for each product
      for (const [cnpj, data] of establishmentMap) {
        for (const [productId, product] of data.products) {
          const trend = await calculatePriceTrend(cnpj, productId);
          product.price_trend = trend;
        }
      }

      // Build final establishments array
      const establishmentsData: EstablishmentWithProducts[] = establishmentData?.map(est => {
        const data = establishmentMap.get(est.cnpj)!;
        return {
          cnpj: est.cnpj,
          razao_social: est.razao_social,
          nome_fantasia: est.nome_fantasia,
          monitored_products: Array.from(data.products.values()),
          total_products: data.products.size,
          last_update: data.lastUpdate
        };
      }) || [];

      setEstablishments(establishmentsData);
    } catch (error) {
      console.error('Error fetching establishments:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados dos concorrentes.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate price trend for a specific product and establishment
  const calculatePriceTrend = async (cnpj: string, trackedItemId: number): Promise<'up' | 'down' | 'stable' | null> => {
    try {
      const { data, error } = await supabase
        .from('price_history')
        .select('sale_price, fetch_date')
        .eq('establishment_cnpj', cnpj)
        .eq('tracked_item_id', trackedItemId)
        .order('fetch_date', { ascending: false })
        .limit(2);

      if (error || !data || data.length < 2) return null;

      const [latest, previous] = data;
      const currentPrice = latest.sale_price;
      const previousPrice = previous.sale_price;
      
      const changePercent = ((currentPrice - previousPrice) / previousPrice) * 100;
      
      if (changePercent > 2) return 'up';
      if (changePercent < -2) return 'down';
      return 'stable';
    } catch {
      return null;
    }
  };

  // Toggle competitor selection
  const toggleCompetitor = (cnpj: string) => {
    setSelectedCompetitors(prev => {
      const existing = prev.find(c => c.cnpj === cnpj);
      
      if (existing) {
        // Remove competitor
        return prev.filter(c => c.cnpj !== cnpj);
      } else {
        // Add competitor (max 5)
        if (prev.length >= 5) {
          toast({
            title: "Limite atingido",
            description: "Você pode selecionar no máximo 5 concorrentes.",
            variant: "destructive",
          });
          return prev;
        }
        
        return [...prev, { cnpj, selectedProducts: [] }];
      }
    });
  };

  // Toggle product selection for a competitor
  const toggleProduct = (cnpj: string, productId: number) => {
    setSelectedCompetitors(prev => 
      prev.map(competitor => {
        if (competitor.cnpj === cnpj) {
          const products = competitor.selectedProducts.includes(productId)
            ? competitor.selectedProducts.filter(id => id !== productId)
            : [...competitor.selectedProducts, productId];
          
          return { ...competitor, selectedProducts: products };
        }
        return competitor;
      })
    );
  };

  // Select all products for a competitor
  const selectAllProducts = (cnpj: string) => {
    const establishment = establishments.find(e => e.cnpj === cnpj);
    if (!establishment) return;

    const allProductIds = establishment.monitored_products.map(p => p.tracked_item_id);
    
    setSelectedCompetitors(prev =>
      prev.map(competitor =>
        competitor.cnpj === cnpj
          ? { ...competitor, selectedProducts: allProductIds }
          : competitor
      )
    );
  };

  // Clear all selections
  const clearSelections = () => {
    setSelectedCompetitors([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  // Get selected competitors with product details
  const getSelectedCompetitorsWithProducts = () => {
    return selectedCompetitors.map(selection => {
      const establishment = establishments.find(e => e.cnpj === selection.cnpj);
      if (!establishment) return null;

      const selectedProducts = establishment.monitored_products.filter(
        product => selection.selectedProducts.includes(product.tracked_item_id)
      );

      return {
        ...establishment,
        monitored_products: selectedProducts,
        total_selected_products: selectedProducts.length
      };
    }).filter(Boolean);
  };

  // Check if competitor is selected
  const isCompetitorSelected = (cnpj: string) => {
    return selectedCompetitors.some(c => c.cnpj === cnpj);
  };

  // Check if product is selected
  const isProductSelected = (cnpj: string, productId: number) => {
    const competitor = selectedCompetitors.find(c => c.cnpj === cnpj);
    return competitor?.selectedProducts.includes(productId) || false;
  };

  // Get total selected products count
  const getTotalSelectedProducts = () => {
    return selectedCompetitors.reduce((total, competitor) => 
      total + competitor.selectedProducts.length, 0
    );
  };

  // Start analysis with validations
  const startAnalysis = () => {
    const totalProducts = getTotalSelectedProducts();
    const selectedCompetitorsCount = selectedCompetitors.length;

    if (selectedCompetitorsCount < 2) {
      toast({
        title: "Seleção insuficiente",
        description: "Selecione pelo menos 2 concorrentes para iniciar a análise.",
        variant: "destructive",
      });
      return;
    }

    if (totalProducts < 1) {
      toast({
        title: "Produtos não selecionados",
        description: "Selecione pelo menos 1 produto para análise.",
        variant: "destructive",
      });
      return;
    }

    setAnalysisActive(true);
    toast({
      title: "Análise iniciada",
      description: `Análise ativada com ${selectedCompetitorsCount} concorrentes e ${totalProducts} produtos.`,
      variant: "default",
    });
  };

  // Stop analysis
  const stopAnalysis = () => {
    setAnalysisActive(false);
    toast({
      title: "Análise parada",
      description: "A análise comparativa foi desativada.",
      variant: "default",
    });
  };

  // Check if analysis can be started
  const canStartAnalysis = () => {
    return selectedCompetitors.length >= 2 && getTotalSelectedProducts() >= 1;
  };

  useEffect(() => {
    fetchEstablishments();
  }, []);

  return {
    establishments,
    selectedCompetitors,
    analysisActive,
    loading,
    toggleCompetitor,
    toggleProduct,
    selectAllProducts,
    clearSelections,
    getSelectedCompetitorsWithProducts,
    isCompetitorSelected,
    isProductSelected,
    getTotalSelectedProducts,
    startAnalysis,
    stopAnalysis,
    canStartAnalysis,
    refetch: fetchEstablishments
  };
}