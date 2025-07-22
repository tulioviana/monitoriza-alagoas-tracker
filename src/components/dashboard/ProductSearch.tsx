
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Loader2, MapPin, Plus, Activity, ChevronLeft, ChevronRight } from 'lucide-react'
import { useProductSearch } from '@/hooks/useSefazAPI'
import { useCreateTrackedItem } from '@/hooks/useTrackedItems'
import { MUNICIPIOS_ALAGOAS } from '@/lib/constants'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'

export function ProductSearch() {
  const [gtin, setGtin] = useState('')
  const [description, setDescription] = useState('')
  const [establishmentType, setEstablishmentType] = useState<'municipio' | 'geolocalizacao'>('municipio')
  const [municipality, setMunicipality] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [searchMode, setSearchMode] = useState<'municipio' | 'cnpj'>('municipio')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [radius, setRadius] = useState('5')
  const [days, setDays] = useState('7')
  const [isTestingConnectivity, setIsTestingConnectivity] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  const ITEMS_PER_PAGE = 30

  const productSearchMutation = useProductSearch()
  const createTrackedItemMutation = useCreateTrackedItem()

  const formatCnpj = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  }

  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCnpj(e.target.value)
    if (formatted.length <= 18) {
      setCnpj(formatted)
      // Quando CNPJ é preenchido, limpar município e mudar modo
      if (formatted.trim()) {
        setMunicipality('')
        setSearchMode('cnpj')
      }
    }
  }

  const handleMunicipalityChange = (value: string) => {
    setMunicipality(value)
    // Quando município é selecionado, limpar CNPJ e mudar modo
    if (value) {
      setCnpj('')
      setSearchMode('municipio')
    }
  }

  const testConnectivity = async () => {
    setIsTestingConnectivity(true)
    console.log('=== INICIANDO TESTE MANUAL DE CONECTIVIDADE ===')
    
    try {
      const { data, error } = await supabase.functions.invoke('sefaz-api-proxy', {
        method: 'GET'
      })

      console.log('=== RESULTADO DO TESTE MANUAL ===')
      if (error) {
        console.error('❌ Erro no teste:', error)
        toast.error(`Erro de conectividade: ${error.message}`)
      } else {
        console.log('✅ Teste bem-sucedido:', data)
        toast.success('✅ Conectividade OK! Edge Function está funcionando.')
      }
    } catch (error) {
      console.error('❌ Erro crítico no teste:', error)
      toast.error(`Erro crítico: ${error}`)
    } finally {
      setIsTestingConnectivity(false)
    }
  }

  const handleSearch = () => {
    if (!gtin && !description) {
      toast.error('Informe pelo menos um critério de busca (GTIN ou descrição)')
      return
    }

    if (establishmentType === 'municipio' && !municipality && !cnpj) {
      toast.error('Selecione um município OU informe um CNPJ (não ambos)')
      return
    }

    // Validação: município e CNPJ são mutuamente exclusivos
    if (establishmentType === 'municipio' && municipality && cnpj) {
      toast.error('Informe apenas um critério: município OU CNPJ, nunca ambos')
      return
    }

    if (establishmentType === 'geolocalizacao' && (!latitude || !longitude)) {
      toast.error('Informe a localização')
      return
    }

    console.log('=== PREPARANDO BUSCA ===')
    const searchParams = {
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
    }

    console.log('🔍 Parâmetros de busca preparados:', JSON.stringify(searchParams, null, 2))
    setCurrentPage(1) // Reset para primeira página em nova busca
    productSearchMutation.mutate(searchParams)
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

  const handleTrackItem = (item: any) => {
    const nickname = `${item.produto.descricao} - ${item.estabelecimento.nomeFantasia || item.estabelecimento.razaoSocial}`
    
    createTrackedItemMutation.mutate({
      nickname,
      item_type: 'produto',
      search_criteria: {
        produto: {
          gtin: item.produto.gtin,
          descricao: item.produto.descricao
        },
        estabelecimento: {
          individual: { cnpj: item.estabelecimento.cnpj }
        },
        dias: parseInt(days)
      },
      is_active: true
    })
  }

  return (
    <div className="space-y-6">
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
            <Button 
              onClick={testConnectivity}
              disabled={isTestingConnectivity}
              variant="outline"
              size="sm"
            >
              {isTestingConnectivity ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Activity className="mr-2 h-4 w-4" />
              )}
              Testar Conectividade
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="gtin">GTIN/Código de Barras</Label>
              <Input
                id="gtin"
                value={gtin}
                onChange={(e) => setGtin(e.target.value)}
                placeholder=""
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrição do Produto</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder=""
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tipo de Estabelecimento</Label>
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

          {establishmentType === 'municipio' ? (
            <div className="space-y-4">
              {/* Seletor de modo de busca */}
              <div className="space-y-2">
                <Label>Critério de Estabelecimento</Label>
                <Select value={searchMode} onValueChange={(value: 'municipio' | 'cnpj') => {
                  setSearchMode(value)
                  // Limpar o campo oposto quando trocar modo
                  if (value === 'municipio') {
                    setCnpj('')
                  } else {
                    setMunicipality('')
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
              {searchMode === 'municipio' && (
                <div className="space-y-2">
                  <Label>Município</Label>
                  <Select value={municipality} onValueChange={handleMunicipalityChange}>
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
                    Busca produtos em todos os estabelecimentos do município selecionado
                  </p>
                </div>
              )}

              {/* Campo de CNPJ (só aparece se modo = cnpj) */}
              {searchMode === 'cnpj' && (
                <div className="space-y-2">
                  <Label htmlFor="cnpj">CNPJ do Estabelecimento</Label>
                  <Input
                    id="cnpj"
                    placeholder="00.000.000/0000-00"
                    value={cnpj}
                    onChange={handleCnpjChange}
                    maxLength={18}
                  />
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
                <Input
                  type="number"
                  step="any"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  placeholder="-9.6658"
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
                />
              </div>
              <div className="md:col-span-3">
                <Button onClick={getUserLocation} variant="outline" size="sm">
                  <MapPin className="h-4 w-4 mr-2" />
                  Usar minha localização
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Dias da Pesquisa</Label>
            <Select value={days} onValueChange={setDays}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 5, 7, 10].map((day) => (
                  <SelectItem key={day} value={day.toString()}>
                    {day} {day === 1 ? 'dia' : 'dias'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button 
            onClick={handleSearch} 
            disabled={productSearchMutation.isPending}
            className="w-full"
          >
            {productSearchMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Buscar Produtos
          </Button>
        </CardContent>
      </Card>

      {productSearchMutation.data && (
        <Card>
          <CardHeader>
            <CardTitle>Resultados da Busca</CardTitle>
            <CardDescription>
              {productSearchMutation.data.totalRegistros} produtos encontrados
              {productSearchMutation.data.totalRegistros > ITEMS_PER_PAGE && (
                <span className="ml-2 text-muted-foreground">
                  (página {currentPage} de {Math.ceil(productSearchMutation.data.totalRegistros / ITEMS_PER_PAGE)})
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(() => {
                const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
                const endIndex = startIndex + ITEMS_PER_PAGE
                const currentItems = productSearchMutation.data.conteudo.slice(startIndex, endIndex)
                
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

                    <Button 
                      size="sm" 
                      className="w-full mt-2"
                      onClick={() => handleTrackItem(item)}
                      disabled={createTrackedItemMutation.isPending}
                    >
                      {createTrackedItemMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4 mr-2" />
                      )}
                      Monitorar este Produto
                    </Button>
                  </div>
                ))
              })()}
            </div>

            {/* Controles de Paginação */}
            {productSearchMutation.data.totalRegistros > ITEMS_PER_PAGE && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Mostrando {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, productSearchMutation.data.totalRegistros)} a{' '}
                  {Math.min(currentPage * ITEMS_PER_PAGE, productSearchMutation.data.totalRegistros)} de{' '}
                  {productSearchMutation.data.totalRegistros} resultados
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Anterior
                  </Button>
                  
                  <div className="flex items-center space-x-1">
                    {(() => {
                      const totalPages = Math.ceil(productSearchMutation.data.totalRegistros / ITEMS_PER_PAGE)
                      const pages = []
                      const maxVisiblePages = 5
                      
                      let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2))
                      let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)
                      
                      if (endPage - startPage + 1 < maxVisiblePages) {
                        startPage = Math.max(1, endPage - maxVisiblePages + 1)
                      }
                      
                      for (let i = startPage; i <= endPage; i++) {
                        pages.push(
                          <Button
                            key={i}
                            variant={currentPage === i ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(i)}
                            className="w-8 h-8 p-0"
                          >
                            {i}
                          </Button>
                        )
                      }
                      
                      return pages
                    })()}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(Math.ceil(productSearchMutation.data.totalRegistros / ITEMS_PER_PAGE), prev + 1))}
                    disabled={currentPage === Math.ceil(productSearchMutation.data.totalRegistros / ITEMS_PER_PAGE)}
                  >
                    Próxima
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
