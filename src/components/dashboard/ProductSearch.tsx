import { useState, useEffect, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, MapPin, Plus, Activity, ChevronLeft, ChevronRight, Bell, Search, AlertCircle, ArrowDown, ArrowUp } from 'lucide-react';
import { useProductSearch } from '@/hooks/useSefazAPI';
import { useSearchHistory } from '@/hooks/useSearchHistory';
import { useExcelExport, type ProductExportData, type SearchCriteria } from '@/hooks/useExcelExport';
import { useUserCredits } from '@/hooks/useUserCredits';
import { useRole } from '@/contexts/RoleContext';
import { usePlan } from '@/contexts/PlanContext';
import { CreditCounter } from '@/components/ui/credit-counter';
import { MUNICIPIOS_ALAGOAS } from '@/lib/constants';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { AddToMonitoringModal } from './AddToMonitoringModal';
import { ExportDropdown } from '@/components/ui/export-button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ProductSearchProps {
  pendingSearchCriteria?: any;
  onSearchCriteriaProcessed?: () => void;
}

export function ProductSearch({ pendingSearchCriteria, onSearchCriteriaProcessed }: ProductSearchProps) {
  const [gtin, setGtin] = useState('');
  const [description, setDescription] = useState('');
  const [establishmentType, setEstablishmentType] = useState<'municipio' | 'geolocalizacao'>('municipio');
  const [municipality, setMunicipality] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [searchMode, setSearchMode] = useState<'municipio' | 'cnpj'>('municipio');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [radius, setRadius] = useState('5');
  const [isTestingConnectivity, setIsTestingConnectivity] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [sortKey, setSortKey] = useState<'valorVenda' | 'dataVenda'>('dataVenda');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  const instabilityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [currentTab, setCurrentTab] = useState('products');
  const ITEMS_PER_PAGE = 30;
  const productSearchMutation = useProductSearch();
  const { saveSearch } = useSearchHistory();
  const { generateProductExcel, isExporting } = useExcelExport();
  const { hasCredits } = useUserCredits();
  const { isAdmin } = useRole();
  const { isLite } = usePlan();

  const loadingMessages = [
    "Estamos batendo um papo com o pessoal do caixa para conseguir aquele descontinho de amigo.",
    "Nossos detetives de ofertas estão farejando os melhores preços!",
    "Nossos robôs estão em uma verdadeira caça ao tesouro por suas ofertas!",
    "Um momento... Nossos algoritmos estão pechinchando nos bastidores para você.",
    "Estamos conferindo etiqueta por etiqueta… o preço campeão vem aí!",
    "Lupa em mãos, estamos inspecionando cada preço.",
    "Consultando os astros dos preços... Eles dizem que uma boa oferta está a caminho!"
  ];

  const toastIdRef = useRef<string | number | null>(null);

  useEffect(() => {
    if (productSearchMutation.isPending) {
      const timeoutId = setTimeout(() => {
        const randomMessage = loadingMessages[Math.floor(Math.random() * loadingMessages.length)];
        toastIdRef.current = toast.loading(randomMessage, {
          duration: Infinity,
          position: 'top-right',
        });
      }, 10000);

      return () => {
        clearTimeout(timeoutId);
        if (toastIdRef.current) {
          toast.dismiss(toastIdRef.current);
          toastIdRef.current = null;
        }
      };
    } else {
        if (toastIdRef.current) {
            toast.dismiss(toastIdRef.current);
            toastIdRef.current = null;
        }
    }
  }, [productSearchMutation.isPending]);

  useEffect(() => {
    if (pendingSearchCriteria && onSearchCriteriaProcessed) {
      if (pendingSearchCriteria.produto?.gtin) {
        setGtin(pendingSearchCriteria.produto.gtin);
      }
      if (pendingSearchCriteria.produto?.descricao) {
        setDescription(pendingSearchCriteria.produto.descricao);
      }
      if (pendingSearchCriteria.estabelecimento?.municipio?.codigoIBGE) {
        setMunicipality(pendingSearchCriteria.estabelecimento.municipio.codigoIBGE);
        setSearchMode('municipio');
        setEstablishmentType('municipio');
      }
      if (pendingSearchCriteria.estabelecimento?.individual?.cnpj) {
        setCnpj(formatCnpj(pendingSearchCriteria.estabelecimento.individual.cnpj));
        setSearchMode('cnpj');
        setEstablishmentType('municipio');
      }
      if (pendingSearchCriteria.estabelecimento?.geolocalizacao) {
        const geo = pendingSearchCriteria.estabelecimento.geolocalizacao;
        setLatitude(geo.latitude.toString());
        setLongitude(geo.longitude.toString());
        setRadius(geo.raio.toString());
        setEstablishmentType('geolocalizacao');
      }
      
      onSearchCriteriaProcessed();
    }
  }, [pendingSearchCriteria, onSearchCriteriaProcessed]);

  const sortedData = useMemo(() => {
    if (!productSearchMutation.data?.conteudo) return [];
    const sorted = [...productSearchMutation.data.conteudo].sort((a, b) => {
      if (sortKey === 'valorVenda') {
        return sortOrder === 'asc' ? a.produto.venda.valorVenda - b.produto.venda.valorVenda : b.produto.venda.valorVenda - a.produto.venda.valorVenda;
      } else {
        return sortOrder === 'asc' ? new Date(a.produto.venda.dataVenda).getTime() - new Date(b.produto.venda.dataVenda).getTime() : new Date(b.produto.venda.dataVenda).getTime() - new Date(a.produto.venda.dataVenda).getTime();
      }
    });
    return sorted;
  }, [productSearchMutation.data, sortKey, sortOrder]);

  const handleSort = (key: 'valorVenda' | 'dataVenda') => {
    if (key === sortKey) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  };

  const formatCnpj = (value: string) => {
    if (!value || typeof value !== 'string') return ''
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  };

  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCnpj(e.target.value);
    if (formatted.length <= 18) {
      setCnpj(formatted);
      if (formatted.trim()) {
        setMunicipality('');
        setSearchMode('cnpj');
      }
    }
  };

  const handleMunicipalityChange = (value: string) => {
    setMunicipality(value);
    if (value) {
      setCnpj('');
      setSearchMode('municipio');
    }
  };

  const testConnectivity = async () => {
    setIsTestingConnectivity(true);
    try {
      const { data, error } = await supabase.functions.invoke('sefaz-api-proxy', { method: 'GET' });
      if (error) {
        toast.error(`Erro de conectividade: ${error.message}`);
      } else {
        toast.success('✅ Conectividade OK! Edge Function está funcionando.');
      }
    } catch (error) {
      toast.error(`Erro crítico: ${error}`);
    } finally {
      setIsTestingConnectivity(false);
    }
  };

  const handleSearch = () => {
    const hasProductCriteria = gtin || description;
    const hasEstablishmentCriteria = 
      (establishmentType === 'municipio' && municipality) ||
      (establishmentType === 'municipio' && cnpj) ||
      (establishmentType === 'geolocalizacao' && latitude && longitude);

    if (!hasProductCriteria) {
      toast.error('Por favor, forneça um GTIN ou descrição do produto.');
      return;
    }

    if (!hasEstablishmentCriteria) {
      toast.error('Por favor, selecione um critério de estabelecimento (município, CNPJ ou localização).');
      return;
    }

    if (establishmentType === 'municipio' && municipality && cnpj) {
      toast.error('Informe apenas um critério: município OU CNPJ, nunca ambos');
      return;
    }

    const searchParams = {
      produto: {
        ...(gtin && { gtin }),
        ...(description && { descricao: description })
      },
      estabelecimento: establishmentType === 'municipio' 
        ? (searchMode === 'municipio' && municipality 
            ? { municipio: { codigoIBGE: municipality } } 
            : (searchMode === 'cnpj' && cnpj 
                ? { individual: { cnpj: cnpj.replace(/\D/g, '') } } 
                : {}))
        : { geolocalizacao: { latitude: parseFloat(latitude), longitude: parseFloat(longitude), raio: parseInt(radius) } },
      dias: 10,
      pagina: 1,
      registrosPorPagina: 100
    };

    if (!searchParams.produto || Object.keys(searchParams.produto).length === 0) {
      toast.error('Erro na validação dos critérios de produto. Tente novamente.');
      return;
    }

    if (!searchParams.estabelecimento || Object.keys(searchParams.estabelecimento).length === 0) {
      toast.error('Erro na validação dos critérios de estabelecimento. Tente novamente.');
      return;
    }

    setCurrentPage(1);
    productSearchMutation.mutate(searchParams, {
      onSuccess: (data) => {
        saveSearch({ item_type: 'produto', search_criteria: searchParams });
      },
      onError: (error) => {
        console.error('❌ Erro na busca:', error);
      }
    });
  };

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        position => {
          setLatitude(position.coords.latitude.toString());
          setLongitude(position.coords.longitude.toString());
          toast.success('Localização obtida com sucesso');
        },
        error => {
          toast.error('Erro ao obter localização');
        }
      );
    } else {
      toast.error('Geolocalização não suportada pelo navegador');
    }
  };

  const handleAddToMonitoring = (item: any) => {
    if (isLite) {
      toast.error("O monitoramento de produtos é uma funcionalidade exclusiva para usuários Pro.");
      return;
    }

    const searchCriteria = {
      produto: {
        ...(gtin && { gtin }),
        ...(description && { descricao: description })
      },
      estabelecimento: establishmentType === 'municipio' 
        ? (searchMode === 'municipio' && municipality 
            ? { municipio: { codigoIBGE: municipality } } 
            : (searchMode === 'cnpj' && cnpj 
                ? { individual: { cnpj: cnpj.replace(/\D/g, '') } } 
                : {}))
        : { geolocalizacao: { latitude: parseFloat(latitude), longitude: parseFloat(longitude), raio: parseInt(radius) } },
      dias: 10,
      pagina: 1,
      registrosPorPagina: 100
    };
    
    setSelectedItem({ ...item, searchCriteria });
    setIsModalOpen(true);
  };

  const handleExportExcel = async () => {
    if (!productSearchMutation.data?.conteudo) return;

    const exportData: ProductExportData[] = productSearchMutation.data.conteudo.map(item => ({
      descricao: item.produto.descricao,
      gtin: item.produto.gtin,
      preco: item.produto.venda.valorVenda,
      razaoSocial: item.estabelecimento.nomeFantasia || item.estabelecimento.razaoSocial,
      cnpj: item.estabelecimento.cnpj,
      municipio: item.estabelecimento.endereco.municipio,
      endereco: `${item.estabelecimento.endereco.nomeLogradouro}, ${item.estabelecimento.endereco.numeroImovel} - ${item.estabelecimento.endereco.bairro}`,
      uf: 'AL',
      dataConsulta: item.produto.venda.dataVenda
    }));

    const searchCriteria: SearchCriteria = {
      tipo: 'Produto',
      criterios: {
        ...(gtin && { gtin }),
        ...(description && { descricao: description }),
        ...(municipality && { municipio: MUNICIPIOS_ALAGOAS[municipality] }),
        ...(cnpj && { cnpj }),
        ...(latitude && longitude && { latitude, longitude, raio: radius }),
        dias: 10
      },
      dataConsulta: new Date().toISOString(),
      totalResultados: productSearchMutation.data.totalRegistros
    };

    await generateProductExcel(exportData, searchCriteria);
  };

  return (
    <div className="space-y-6">
      <CreditCounter className="mb-4" />
      
      <Card>
        <CardHeader>
          <CardTitle>Buscar Produtos</CardTitle>
          <CardDescription>
            Encontre produtos por GTIN ou descrição em estabelecimentos de Alagoas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isAdmin && (
            <div className="flex justify-end">
              <Button onClick={testConnectivity} disabled={isTestingConnectivity} variant="outline" size="sm">
                {isTestingConnectivity ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Activity className="mr-2 h-4 w-4" />}
                Testar Conectividade
              </Button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="gtin">GTIN/Código de Barras</Label>
              <Input id="gtin" value={gtin} onChange={e => setGtin(e.target.value)} placeholder="" disabled={productSearchMutation.isPending} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrição do Produto</Label>
              <Input id="description" value={description} onChange={e => setDescription(e.target.value)} placeholder="" disabled={productSearchMutation.isPending} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tipo de Busca</Label>
            <Select value={establishmentType} onValueChange={(value: 'municipio' | 'geolocalizacao') => setEstablishmentType(value)} disabled={productSearchMutation.isPending}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="municipio">Por Município/CNPJ</SelectItem>
                <SelectItem value="geolocalizacao">Por Localização</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {establishmentType === 'municipio' ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Critério de Busca</Label>
                <Select value={searchMode} onValueChange={(value: 'municipio' | 'cnpj') => { setSearchMode(value); if (value === 'municipio') setCnpj(''); else setMunicipality(''); }} disabled={productSearchMutation.isPending}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="municipio">Buscar por Município</SelectItem>
                    <SelectItem value="cnpj">Buscar por CNPJ específico</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {searchMode === 'municipio' && (
                <div className="space-y-2">
                  <Label>Município</Label>
                  <Select value={municipality} onValueChange={handleMunicipalityChange} disabled={productSearchMutation.isPending}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um município" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(MUNICIPIOS_ALAGOAS).map(([code, name]) => <SelectItem key={code} value={code}>{name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Busca produtos em todos os estabelecimentos do município selecionado
                  </p>
                </div>
              )}

              {searchMode === 'cnpj' && (
                <div className="space-y-2">
                  <Label htmlFor="cnpj">CNPJ do Estabelecimento</Label>
                  <Input id="cnpj" placeholder="00.000.000/0000-00" value={cnpj} onChange={handleCnpjChange} maxLength={18} disabled={productSearchMutation.isPending} />
                  <p className="text-xs text-muted-foreground">
                    Busca produtos apenas no estabelecimento com este CNPJ específico
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Latitude</Label>
                <Input type="number" step="any" value={latitude} onChange={e => setLatitude(e.target.value)} placeholder="-9.6658" disabled={productSearchMutation.isPending} />
              </div>
              <div className="space-y-2">
                <Label>Longitude</Label>
                <Input type="number" step="any" value={longitude} onChange={e => setLongitude(e.target.value)} placeholder="-35.7353" disabled={productSearchMutation.isPending} />
              </div>
              <div className="space-y-2">
                <Label>Raio (km)</Label>
                <Input type="number" min="1" max="15" value={radius} onChange={e => setRadius(e.target.value)} disabled={productSearchMutation.isPending} />
              </div>
              <div className="md:col-span-3">
                <Button onClick={getUserLocation} variant="outline" size="sm" disabled={productSearchMutation.isPending}>
                  <MapPin className="h-4 w-4 mr-2" />
                  Usar minha localização
                </Button>
              </div>
            </div>
          )}

          <Button onClick={handleSearch} disabled={productSearchMutation.isPending || !hasCredits()} className="w-full">
            {productSearchMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Buscando...
              </>
            ) : !hasCredits() ? (
              <>
                <AlertCircle className="mr-2 h-4 w-4" />
                Sem Créditos
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Buscar Produtos
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {productSearchMutation.data && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>Resultados da Busca</CardTitle>
                <CardDescription>
                  {productSearchMutation.data.totalRegistros} produtos encontrados
                  {productSearchMutation.data.totalRegistros > ITEMS_PER_PAGE && (
                    <span className="ml-2 text-muted-foreground">
                      (página {currentPage} de {Math.ceil(productSearchMutation.data.totalRegistros / ITEMS_PER_PAGE)})
                    </span>
                  )}
                </CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                <Button onClick={() => handleSort('dataVenda')} variant="outline" size="sm">
                  Data {sortKey === 'dataVenda' && (sortOrder === 'asc' ? <ArrowUp className="h-4 w-4 ml-2" /> : <ArrowDown className="h-4 w-4 ml-2" />)}
                </Button>
                <Button onClick={() => handleSort('valorVenda')} variant="outline" size="sm">
                  Preço {sortKey === 'valorVenda' && (sortOrder === 'asc' ? <ArrowUp className="h-4 w-4 ml-2" /> : <ArrowDown className="h-4 w-4 ml-2" />)}
                </Button>
                <ExportDropdown
                  onExportExcel={handleExportExcel}
                  isExporting={isExporting}
                  resultCount={productSearchMutation.data.totalRegistros}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(() => {
                const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
                const endIndex = startIndex + ITEMS_PER_PAGE;
                const currentItems = sortedData.slice(startIndex, endIndex);
                return currentItems.map((item, index) => (
                  <div key={startIndex + index} className="border rounded-lg p-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold">{item.produto.descricao}</h3>
                        <p className="text-sm text-muted-foreground">
                          GTIN: {item.produto.gtin} | {item.produto.unidadeMedida}
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-lg font-bold">
                        R$ {item.produto.venda.valorVenda.toFixed(2)}
                      </Badge>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="font-medium">{item.estabelecimento.nomeFantasia || item.estabelecimento.razaoSocial}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.estabelecimento.endereco.nomeLogradouro}, {item.estabelecimento.endereco.numeroImovel} - {item.estabelecimento.endereco.bairro}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {item.estabelecimento.endereco.municipio} | Data: {new Date(item.produto.venda.dataVenda).toLocaleDateString('pt-BR')}
                      </p>
                    </div>

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="w-full">
                            <Button 
                              size="sm" 
                              className="w-full mt-2" 
                              onClick={() => handleAddToMonitoring(item)} 
                              variant="outline"
                              disabled={isLite}
                            >
                              <Bell className="h-4 w-4 mr-2" />
                              Monitorar Produto
                            </Button>
                          </div>
                        </TooltipTrigger>
                        {isLite && (
                          <TooltipContent>
                            <p>O monitoramento de produtos é uma funcionalidade exclusiva para usuários Pro.</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                ));
              })()}
            </div>

            {productSearchMutation.data.totalRegistros > ITEMS_PER_PAGE && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Mostrando {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, productSearchMutation.data.totalRegistros)} a{' '}
                  {Math.min(currentPage * ITEMS_PER_PAGE, productSearchMutation.data.totalRegistros)} de{' '}
                  {productSearchMutation.data.totalRegistros} resultados
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1}>
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Anterior
                  </Button>
                  
                  <div className="flex items-center space-x-1">
                    {(() => {
                      const totalPages = Math.ceil(productSearchMutation.data.totalRegistros / ITEMS_PER_PAGE);
                      const pages = [];
                      const maxVisiblePages = 5;
                      let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
                      let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
                      if (endPage - startPage + 1 < maxVisiblePages) {
                        startPage = Math.max(1, endPage - maxVisiblePages + 1);
                      }
                      for (let i = startPage; i <= endPage; i++) {
                        pages.push(
                          <Button key={i} variant={currentPage === i ? "default" : "outline"} size="sm" onClick={() => setCurrentPage(i)} className="w-8 h-8 p-0">
                            {i}
                          </Button>
                        );
                      }
                      return pages;
                    })()}
                  </div>
                  
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(Math.ceil(productSearchMutation.data.totalRegistros / ITEMS_PER_PAGE), prev + 1))} disabled={currentPage === Math.ceil(productSearchMutation.data.totalRegistros / ITEMS_PER_PAGE)}>
                    Próxima
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {selectedItem && (
        <AddToMonitoringModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          itemType="produto"
          searchCriteria={selectedItem.searchCriteria}
          suggestedName={`${selectedItem.produto.descricao} - ${selectedItem.estabelecimento.nomeFantasia || selectedItem.estabelecimento.razaoSocial}`}
          establishmentCnpj={selectedItem.estabelecimento.cnpj}
          establishmentName={selectedItem.estabelecimento.nomeFantasia || selectedItem.estabelecimento.razaoSocial}
          currentSalePrice={selectedItem.produto.venda.valorVenda}
          currentDeclaredPrice={selectedItem.produto.declarado?.valorDeclarado}
        />
      )}
    </div>
  );
}