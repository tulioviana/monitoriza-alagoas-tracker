import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, MapPin, Plus, Activity, ChevronLeft, ChevronRight, Bell } from 'lucide-react';
import { useProductSearch } from '@/hooks/useSefazAPI';
import { useSearchHistory } from '@/hooks/useSearchHistory';
import { useExcelExport, type ProductExportData, type SearchCriteria } from '@/hooks/useExcelExport';
import { MUNICIPIOS_ALAGOAS } from '@/lib/constants';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { AddToMonitoringModal } from './AddToMonitoringModal';
import { ExportDropdown } from '@/components/ui/export-button';

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
  const [days, setDays] = useState('7');
  const [isTestingConnectivity, setIsTestingConnectivity] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const ITEMS_PER_PAGE = 30;
  const productSearchMutation = useProductSearch();
  const { saveSearch } = useSearchHistory();
  const { generateProductExcel, isExporting } = useExcelExport();

  useEffect(() => {
    if (pendingSearchCriteria && onSearchCriteriaProcessed) {
      // Preencher os campos com os critérios de busca do histórico
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
      if (pendingSearchCriteria.dias) {
        setDays(pendingSearchCriteria.dias.toString());
      }
      
      onSearchCriteriaProcessed();
    }
  }, [pendingSearchCriteria, onSearchCriteriaProcessed]);
  const formatCnpj = (value: string) => {
    if (!value || typeof value !== 'string') return ''
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  };
  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCnpj(e.target.value);
    if (formatted.length <= 18) {
      setCnpj(formatted);
      // Quando CNPJ é preenchido, limpar município e mudar modo
      if (formatted.trim()) {
        setMunicipality('');
        setSearchMode('cnpj');
      }
    }
  };
  const handleMunicipalityChange = (value: string) => {
    setMunicipality(value);
    // Quando município é selecionado, limpar CNPJ e mudar modo
    if (value) {
      setCnpj('');
      setSearchMode('municipio');
    }
  };
  const testConnectivity = async () => {
    setIsTestingConnectivity(true);
    console.log('=== INICIANDO TESTE MANUAL DE CONECTIVIDADE ===');
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke('sefaz-api-proxy', {
        method: 'GET'
      });
      console.log('=== RESULTADO DO TESTE MANUAL ===');
      if (error) {
        console.error('❌ Erro no teste:', error);
        toast.error(`Erro de conectividade: ${error.message}`);
      } else {
        console.log('✅ Teste bem-sucedido:', data);
        toast.success('✅ Conectividade OK! Edge Function está funcionando.');
      }
    } catch (error) {
      console.error('❌ Erro crítico no teste:', error);
      toast.error(`Erro crítico: ${error}`);
    } finally {
      setIsTestingConnectivity(false);
    }
  };
  const handleSearch = () => {
    if (!gtin && !description) {
      toast.error('Informe pelo menos um critério de busca (GTIN ou descrição)');
      return;
    }
    if (establishmentType === 'municipio' && !municipality && !cnpj) {
      toast.error('Selecione um município OU informe um CNPJ (não ambos)');
      return;
    }

    // Validação: município e CNPJ são mutuamente exclusivos
    if (establishmentType === 'municipio' && municipality && cnpj) {
      toast.error('Informe apenas um critério: município OU CNPJ, nunca ambos');
      return;
    }
    if (establishmentType === 'geolocalizacao' && (!latitude || !longitude)) {
      toast.error('Informe a localização');
      return;
    }
    console.log('=== PREPARANDO BUSCA ===');
    const searchParams = {
      produto: {
        ...(gtin && {
          gtin
        }),
        ...(description && {
          descricao: description
        })
      },
      estabelecimento: establishmentType === 'municipio' ? searchMode === 'municipio' && municipality ? {
        municipio: {
          codigoIBGE: municipality
        }
      } : searchMode === 'cnpj' && cnpj ? {
        individual: {
          cnpj: cnpj.replace(/\D/g, '')
        }
      } : {} : {
        geolocalizacao: {
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          raio: parseInt(radius)
        }
      },
      dias: parseInt(days),
      pagina: 1,
      registrosPorPagina: 100
    };
    console.log('🔍 Parâmetros de busca preparados:', JSON.stringify(searchParams, null, 2));
    setCurrentPage(1); // Reset para primeira página em nova busca
    productSearchMutation.mutate(searchParams, {
      onSuccess: (data) => {
        console.log('Search results:', data);
        // Salvar apenas uma linha no histórico por busca realizada
        saveSearch({
          item_type: 'produto',
          search_criteria: searchParams,
        });
      },
      onError: (error) => {
        console.error('Search error:', error);
      }
    });
  };
  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(position => {
        setLatitude(position.coords.latitude.toString());
        setLongitude(position.coords.longitude.toString());
        toast.success('Localização obtida com sucesso');
      }, error => {
        toast.error('Erro ao obter localização');
        console.error(error);
      });
    } else {
      toast.error('Geolocalização não suportada pelo navegador');
    }
  };
  const handleAddToMonitoring = (item: any) => {
    const searchCriteria = {
      produto: {
        ...(gtin && { gtin }),
        ...(description && { descricao: description })
      },
      estabelecimento: establishmentType === 'municipio' 
        ? searchMode === 'municipio' && municipality 
          ? { municipio: { codigoIBGE: municipality } }
          : searchMode === 'cnpj' && cnpj 
          ? { individual: { cnpj: cnpj.replace(/\D/g, '') } }
          : {}
        : {
            geolocalizacao: {
              latitude: parseFloat(latitude),
              longitude: parseFloat(longitude),
              raio: parseInt(radius)
            }
          },
      dias: parseInt(days),
      pagina: 1,
      registrosPorPagina: 100
    };
    
    setSelectedItem({
      ...item,
      searchCriteria
    });
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
        ...(municipality && { municipio: municipality }),
        ...(cnpj && { cnpj }),
        ...(latitude && longitude && { latitude, longitude, raio: radius }),
        dias: parseInt(days)
      },
      dataConsulta: new Date().toISOString(),
      totalResultados: productSearchMutation.data.totalRegistros
    };

    await generateProductExcel(exportData, searchCriteria);
  };
  return <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Buscar Produtos</CardTitle>
          <CardDescription>
            Encontre produtos por GTIN ou descrição em estabelecimentos de Alagoas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Botão de teste de conectividade */}
          <div className="flex justify-end">
            <Button onClick={testConnectivity} disabled={isTestingConnectivity} variant="outline" size="sm">
              {isTestingConnectivity ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Activity className="mr-2 h-4 w-4" />}
              Testar Conectividade
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="gtin">GTIN/Código de Barras</Label>
              <Input id="gtin" value={gtin} onChange={e => setGtin(e.target.value)} placeholder="" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrição do Produto</Label>
              <Input id="description" value={description} onChange={e => setDescription(e.target.value)} placeholder="" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tipo de Busca</Label>
            <Select value={establishmentType} onValueChange={(value: 'municipio' | 'geolocalizacao') => setEstablishmentType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="municipio">Por Município/CNPJ</SelectItem>
                <SelectItem value="geolocalizacao">Por Localização</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {establishmentType === 'municipio' ? <div className="space-y-4">
              {/* Seletor de modo de busca */}
              <div className="space-y-2">
                <Label>Critério de Busca</Label>
                <Select value={searchMode} onValueChange={(value: 'municipio' | 'cnpj') => {
              setSearchMode(value);
              // Limpar o campo oposto quando trocar modo
              if (value === 'municipio') {
                setCnpj('');
              } else {
                setMunicipality('');
              }
            }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="municipio">Buscar por Município</SelectItem>
                    <SelectItem value="cnpj">Buscar por CNPJ específico</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Campo de município (só aparece se modo = municipio) */}
              {searchMode === 'municipio' && <div className="space-y-2">
                  <Label>Município</Label>
                  <Select value={municipality} onValueChange={handleMunicipalityChange}>
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
                </div>}

              {/* Campo de CNPJ (só aparece se modo = cnpj) */}
              {searchMode === 'cnpj' && <div className="space-y-2">
                  <Label htmlFor="cnpj">CNPJ do Estabelecimento</Label>
                  <Input id="cnpj" placeholder="00.000.000/0000-00" value={cnpj} onChange={handleCnpjChange} maxLength={18} />
                  <p className="text-xs text-muted-foreground">
                    Busca produtos apenas no estabelecimento com este CNPJ específico
                  </p>
                </div>}
            </div> : <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Latitude</Label>
                <Input type="number" step="any" value={latitude} onChange={e => setLatitude(e.target.value)} placeholder="-9.6658" />
              </div>
              <div className="space-y-2">
                <Label>Longitude</Label>
                <Input type="number" step="any" value={longitude} onChange={e => setLongitude(e.target.value)} placeholder="-35.7353" />
              </div>
              <div className="space-y-2">
                <Label>Raio (km)</Label>
                <Input type="number" min="1" max="15" value={radius} onChange={e => setRadius(e.target.value)} />
              </div>
              <div className="md:col-span-3">
                <Button onClick={getUserLocation} variant="outline" size="sm">
                  <MapPin className="h-4 w-4 mr-2" />
                  Usar minha localização
                </Button>
              </div>
            </div>}

          <div className="space-y-2">
            <Label>Dias da Pesquisa</Label>
            <Select value={days} onValueChange={setDays}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 5, 7, 10].map(day => <SelectItem key={day} value={day.toString()}>
                    {day} {day === 1 ? 'dia' : 'dias'}
                  </SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleSearch} disabled={productSearchMutation.isPending} className="w-full">
            {productSearchMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Buscar Produtos
          </Button>
        </CardContent>
      </Card>

      {productSearchMutation.data && <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>Resultados da Busca</CardTitle>
                <CardDescription>
                  {productSearchMutation.data.totalRegistros} produtos encontrados
                  {productSearchMutation.data.totalRegistros > ITEMS_PER_PAGE && <span className="ml-2 text-muted-foreground">
                      (página {currentPage} de {Math.ceil(productSearchMutation.data.totalRegistros / ITEMS_PER_PAGE)})
                    </span>}
                </CardDescription>
              </div>
              <ExportDropdown
                onExportExcel={() => handleExportExcel()}
                isExporting={isExporting}
                resultCount={productSearchMutation.data.totalRegistros}
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(() => {
            const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
            const endIndex = startIndex + ITEMS_PER_PAGE;
            const currentItems = productSearchMutation.data.conteudo.slice(startIndex, endIndex);
            return currentItems.map((item, index) => <div key={startIndex + index} className="border rounded-lg p-4 space-y-2">
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

                    <Button size="sm" className="w-full mt-2" onClick={() => handleAddToMonitoring(item)} variant="outline">
                      <Bell className="h-4 w-4 mr-2" />
                      Monitorar Produto
                    </Button>
                  </div>);
          })()}
            </div>

            {/* Controles de Paginação */}
            {productSearchMutation.data.totalRegistros > ITEMS_PER_PAGE && <div className="flex items-center justify-between mt-6 pt-4 border-t">
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
                  pages.push(<Button key={i} variant={currentPage === i ? "default" : "outline"} size="sm" onClick={() => setCurrentPage(i)} className="w-8 h-8 p-0">
                            {i}
                          </Button>);
                }
                return pages;
              })()}
                  </div>
                  
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(Math.ceil(productSearchMutation.data.totalRegistros / ITEMS_PER_PAGE), prev + 1))} disabled={currentPage === Math.ceil(productSearchMutation.data.totalRegistros / ITEMS_PER_PAGE)}>
                    Próxima
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>}
          </CardContent>
        </Card>}

      {selectedItem && (
        <AddToMonitoringModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          itemType="produto"
          searchCriteria={selectedItem.searchCriteria}
          suggestedName={`${selectedItem.produto.descricao} - ${selectedItem.estabelecimento.nomeFantasia || selectedItem.estabelecimento.razaoSocial}`}
          establishmentCnpj={selectedItem.estabelecimento.cnpj}
          establishmentName={selectedItem.estabelecimento.nomeFantasia || selectedItem.estabelecimento.razaoSocial}
        />
      )}
    </div>;
}