import { useState, useEffect, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, MapPin, Plus, Bell, Search, AlertCircle, ArrowDown, ArrowUp } from 'lucide-react';
import { useFuelSearch } from '@/hooks/useSefazAPI';
import { useSearchHistory } from '@/hooks/useSearchHistory';
import { useExcelExport, type FuelExportData, type SearchCriteria } from '@/hooks/useExcelExport';
import { useUserCredits } from '@/hooks/useUserCredits';
import { usePlan } from '@/contexts/PlanContext';
import { CreditCounter } from '@/components/ui/credit-counter';
import { MUNICIPIOS_ALAGOAS, TIPOS_COMBUSTIVEL } from '@/lib/constants';
import { toast } from 'sonner';
import { AddToMonitoringModal } from './AddToMonitoringModal';
import { ExportDropdown } from '@/components/ui/export-button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface FuelSearchProps {
  pendingSearchCriteria?: any;
  onSearchCriteriaProcessed?: () => void;
}

export function FuelSearch({ pendingSearchCriteria, onSearchCriteriaProcessed }: FuelSearchProps) {
  const [fuelType, setFuelType] = useState('')
  const [displayedFuelType, setDisplayedFuelType] = useState('')
  const [establishmentType, setEstablishmentType] = useState<'municipio' | 'geolocalizacao'>('municipio')
  const [municipality, setMunicipality] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [searchMode, setSearchMode] = useState<'municipio' | 'cnpj'>('municipio')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [radius, setRadius] = useState('5')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const instabilityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [sortKey, setSortKey] = useState<'valorVenda' | 'dataVenda'>('dataVenda');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const fuelSearchMutation = useFuelSearch()
  const { saveSearch } = useSearchHistory()
  const { generateFuelExcel, isExporting } = useExcelExport()
  const { hasCredits } = useUserCredits()
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

  // Effect para timeout de instabilidade e limpeza
  useEffect(() => {
    if (fuelSearchMutation.isPending) {
      const timeoutId = setTimeout(() => {
        const randomMessage = loadingMessages[Math.floor(Math.random() * loadingMessages.length)];
        // Armazena o ID do toast na ref
        toastIdRef.current = toast.loading(randomMessage, {
          duration: Infinity,
          position: 'top-right',
        });
      }, 10000); // 10 segundos

      // A função de limpeza é chamada quando o componente é desmontado ou a busca termina
      return () => {
        clearTimeout(timeoutId);
        if (toastIdRef.current) {
          toast.dismiss(toastIdRef.current);
          toastIdRef.current = null;
        }
      };
    } else {
        // Garante que o toast seja removido se a busca terminar antes dos 10s
        if (toastIdRef.current) {
            toast.dismiss(toastIdRef.current);
            toastIdRef.current = null;
        }
    }
  }, [fuelSearchMutation.isPending]);

  useEffect(() => {
    if (pendingSearchCriteria && onSearchCriteriaProcessed) {
      // Preencher os campos com os critérios de busca do histórico
      if (pendingSearchCriteria.produto?.tipoCombustivel) {
        setFuelType(pendingSearchCriteria.produto.tipoCombustivel.toString());
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
  }, [pendingSearchCriteria, onSearchCriteriaProcessed])

  const sortedData = useMemo(() => {
    if (!fuelSearchMutation.data?.conteudo) return [];
    const sorted = [...fuelSearchMutation.data.conteudo].sort((a, b) => {
      if (sortKey === 'valorVenda') {
        return sortOrder === 'asc' ? a.produto.venda.valorVenda - b.produto.venda.valorVenda : b.produto.venda.valorVenda - a.produto.venda.valorVenda;
      } else {
        return sortOrder === 'asc' ? new Date(a.produto.venda.dataVenda).getTime() - new Date(b.produto.venda.dataVenda).getTime() : new Date(b.produto.venda.dataVenda).getTime() - new Date(a.produto.venda.dataVenda).getTime();
      }
    });
    return sorted;
  }, [fuelSearchMutation.data, sortKey, sortOrder]);

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
    const numbers = value.replace(/\D/g, '')
    return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  }

  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCnpj(e.target.value)
    if (formatted.length <= 18) {
      setCnpj(formatted)
      if (formatted.trim()) {
        setMunicipality('')
        setSearchMode('cnpj')
      }
    }
  }

  const handleMunicipalityChange = (value: string) => {
    setMunicipality(value)
    if (value) {
      setCnpj('')
      setSearchMode('municipio')
    }
  }

  const handleSearch = () => {
    // Validação rigorosa dos critérios mínimos
    if (!fuelType) {
      toast.error('Selecione o tipo de combustível')
      return
    }

    const hasLocationCriteria = 
      (establishmentType === 'municipio' && municipality) ||
      (establishmentType === 'municipio' && cnpj) ||
      (establishmentType === 'geolocalizacao' && latitude && longitude);

    if (!hasLocationCriteria) {
      toast.error('Por favor, forneça pelo menos um critério de localização (município, CNPJ ou coordenadas).');
      return;
    }

    if (establishmentType === 'municipio' && municipality && cnpj) {
      toast.error('Informe apenas um critério: município OU CNPJ, nunca ambos')
      return
    }

    const searchParams = {
      produto: {
        tipoCombustivel: parseInt(fuelType)
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
      dias: 10,
      pagina: 1,
      registrosPorPagina: 100
    }

    // Validação final para garantir estrutura válida
    if (!searchParams.produto || !searchParams.produto.tipoCombustivel) {
      toast.error('Erro na validação do tipo de combustível. Tente novamente.');
      return;
    }

    if (!searchParams.estabelecimento || Object.keys(searchParams.estabelecimento).length === 0) {
      toast.error('Erro na validação dos critérios de estabelecimento. Tente novamente.');
      return;
    }

    console.log('🔍 Parâmetros de busca preparados:', JSON.stringify(searchParams, null, 2));

    fuelSearchMutation.mutate(searchParams, {
      onSuccess: (data) => {
        console.log('✅ Resultados da busca de combustíveis:', data)
        console.log('📊 Total de registros:', data.totalRegistros);
        console.log('📄 Conteúdo:', data.conteudo?.length, 'itens');
        
        setDisplayedFuelType(fuelType); // Update displayed fuel type on success
        toast.success(`Encontrados ${data.totalRegistros} resultados`)
        // Salvar apenas uma linha no histórico por busca realizada  
        saveSearch({
          item_type: 'combustivel',
          search_criteria: searchParams,
        });
      },
      onError: (error) => {
        console.error('❌ Erro na busca de combustíveis:', error);
      }
    })
  }

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatitude(position.coords.latitude.toString())
          setLongitude(position.coords.longitude.toString())
          toast.success('Localização obtida com sucesso')
        },
        (error) => {
          toast.error('Erro ao obter localização')
          console.error(error)
        }
      )
    } else {
      toast.error('Geolocalização não suportada pelo navegador')
    }
  }

  const handleAddToMonitoring = (item: any) => {
    if (isLite) {
      toast.error("O monitoramento de combustíveis é uma funcionalidade exclusiva para usuários Pro.");
      return;
    }

    const searchParams = {
      produto: {
        tipoCombustivel: parseInt(fuelType)
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
      dias: 10,
      pagina: 1,
      registrosPorPagina: 100
    };
    
    setSelectedItem({
      ...item,
      searchCriteria: searchParams
    });
    setIsModalOpen(true);
  }

  const handleExportExcel = async () => {
    if (!fuelSearchMutation.data?.conteudo) return;

    const exportData: FuelExportData[] = fuelSearchMutation.data.conteudo.map(item => ({
      produto: TIPOS_COMBUSTIVEL[parseInt(fuelType) as keyof typeof TIPOS_COMBUSTIVEL],
      bandeira: item.estabelecimento.nomeFantasia || item.estabelecimento.razaoSocial,
      preco: item.produto.venda.valorVenda,
      razaoSocial: item.estabelecimento.nomeFantasia || item.estabelecimento.razaoSocial,
      cnpj: item.estabelecimento.cnpj,
      municipio: item.estabelecimento.endereco.municipio,
      endereco: `${item.estabelecimento.endereco.nomeLogradouro}, ${item.estabelecimento.endereco.numeroImovel} - ${item.estabelecimento.endereco.bairro}`,
      uf: 'AL',
      dataConsulta: item.produto.venda.dataVenda
    }));

    const searchCriteria: SearchCriteria = {
      tipo: 'Combustível',
      criterios: {
        tipoCombustivel: TIPOS_COMBUSTIVEL[parseInt(fuelType) as keyof typeof TIPOS_COMBUSTIVEL],
        ...(municipality && { municipio: municipality }),
        ...(cnpj && { cnpj }),
        ...(latitude && longitude && { latitude, longitude, raio: radius }),
        dias: 10
      },
      dataConsulta: new Date().toISOString(),
      totalResultados: fuelSearchMutation.data.totalRegistros
    };

    await generateFuelExcel(exportData, searchCriteria);
  }

  return (
    <div className="space-y-6">
      <CreditCounter className="mb-4" />
      
      <Card>
        <CardHeader>
          <CardTitle>Buscar Combustíveis</CardTitle>
          <CardDescription>
            Encontre postos de combustível e monitore os preços
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Combustível</Label>
              <Select value={fuelType} onValueChange={setFuelType} disabled={fuelSearchMutation.isPending}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o combustível" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TIPOS_COMBUSTIVEL).map(([code, name]) => (
                    <SelectItem key={code} value={code}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tipo de Estabelecimento</Label>
              <Select value={establishmentType} onValueChange={(value: 'municipio' | 'geolocalizacao') => setEstablishmentType(value)} disabled={fuelSearchMutation.isPending}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="municipio">Por Município/CNPJ</SelectItem>
                  <SelectItem value="geolocalizacao">Por Localização</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {establishmentType === 'municipio' ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Critério de Estabelecimento</Label>
                <Select value={searchMode} onValueChange={(value: 'municipio' | 'cnpj') => {
                  setSearchMode(value)
                  if (value === 'municipio') {
                    setCnpj('')
                  } else {
                    setMunicipality('')
                  }
                }} disabled={fuelSearchMutation.isPending}>
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
                  <Select value={municipality} onValueChange={handleMunicipalityChange} disabled={fuelSearchMutation.isPending}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um município" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(MUNICIPIOS_ALAGOAS).map(([code, name]) => (
                        <SelectItem key={code} value={code}>{name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Busca combustíveis em todos os postos do município selecionado
                  </p>
                </div>
              )}

              {searchMode === 'cnpj' && (
                <div className="space-y-2">
                  <Label htmlFor="cnpj">CNPJ do Posto</Label>
                  <Input
                    id="cnpj"
                    placeholder="00.000.000/0000-00"
                    value={cnpj}
                    onChange={handleCnpjChange}
                    maxLength={18}
                    disabled={fuelSearchMutation.isPending}
                  />
                  <p className="text-xs text-muted-foreground">
                    Busca combustíveis apenas no posto com este CNPJ específico
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Latitude</Label>
                <Input
                  type="number"
                  step="any"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  placeholder="-9.6658"
                  disabled={fuelSearchMutation.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label>Longitude</Label>
                <Input
                  type="number"
                  step="any"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  placeholder="-35.7353"
                  disabled={fuelSearchMutation.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label>Raio (km)</Label>
                <Input
                  type="number"
                  min="1"
                  max="15"
                  value={radius}
                  onChange={(e) => setRadius(e.target.value)}
                  disabled={fuelSearchMutation.isPending}
                />
              </div>
              <div className="md:col-span-3">
                <Button onClick={getUserLocation} variant="outline" size="sm" disabled={fuelSearchMutation.isPending}>
                  <MapPin className="h-4 w-4 mr-2" />
                  Usar minha localização
                </Button>
              </div>
            </div>
          )}

          <Button 
            onClick={handleSearch} 
            disabled={fuelSearchMutation.isPending || !hasCredits()}
            className="w-full"
          >
            {fuelSearchMutation.isPending ? (
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
                Buscar Combustíveis
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {fuelSearchMutation.data && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>Resultados da Busca</CardTitle>
                <CardDescription>
                  {fuelSearchMutation.data.totalRegistros} postos encontrados
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
                  onExportExcel={() => handleExportExcel()}
                  isExporting={isExporting}
                  resultCount={fuelSearchMutation.data.totalRegistros}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sortedData.map((item, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold">{TIPOS_COMBUSTIVEL[parseInt(displayedFuelType) as keyof typeof TIPOS_COMBUSTIVEL]}</h3>
                      <p className="text-sm text-muted-foreground">
                        {item.produto.unidadeMedida}
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
                            Monitorar Combustível
                          </Button>
                        </div>
                      </TooltipTrigger>
                      {isLite && (
                        <TooltipContent>
                          <p>O monitoramento de combustíveis é uma funcionalidade exclusiva para usuários Pro.</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {selectedItem && (
        <AddToMonitoringModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          itemType="combustivel"
          searchCriteria={selectedItem.searchCriteria}
          suggestedName={`${TIPOS_COMBUSTIVEL[parseInt(fuelType) as keyof typeof TIPOS_COMBUSTIVEL]} - ${selectedItem.estabelecimento.nomeFantasia || selectedItem.estabelecimento.razaoSocial}`}
          establishmentCnpj={selectedItem.estabelecimento.cnpj}
          establishmentName={selectedItem.estabelecimento.nomeFantasia || selectedItem.estabelecimento.razaoSocial}
          currentSalePrice={selectedItem.produto.venda.valorVenda}
          currentDeclaredPrice={selectedItem.produto.declarado?.valorDeclarado}
        />
      )}
    </div>
  )
}
