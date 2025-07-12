
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Loader2, MapPin, Plus } from 'lucide-react'
import { useProductSearch } from '@/hooks/useSefazAPI'
import { useCreateTrackedItem } from '@/hooks/useTrackedItems'
import { MUNICIPIOS_ALAGOAS } from '@/lib/constants'
import { toast } from 'sonner'

export function ProductSearch() {
  const [gtin, setGtin] = useState('')
  const [description, setDescription] = useState('')
  const [ncm, setNcm] = useState('')
  const [establishmentType, setEstablishmentType] = useState<'municipio' | 'geolocalizacao'>('municipio')
  const [municipality, setMunicipality] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [radius, setRadius] = useState('5')
  const [days, setDays] = useState('7')

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
    }
  }

  const handleSearch = () => {
    if (!gtin && !description && !ncm) {
      toast.error('Informe pelo menos um critério de busca (GTIN, descrição ou NCM)')
      return
    }

    if (establishmentType === 'municipio' && !municipality && !cnpj) {
      toast.error('Selecione um município ou informe um CNPJ')
      return
    }

    if (establishmentType === 'geolocalizacao' && (!latitude || !longitude)) {
      toast.error('Informe a localização')
      return
    }

    const searchParams = {
      produto: {
        ...(gtin && { gtin }),
        ...(description && { descricao: description }),
        ...(ncm && { ncm })
      },
      estabelecimento: establishmentType === 'municipio' 
        ? {
            ...(municipality && { municipio: { codigoIBGE: municipality } }),
            ...(cnpj && { individual: { cnpj: cnpj.replace(/\D/g, '') } })
          }
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

    productSearchMutation.mutate(searchParams, {
      onSuccess: (data) => {
        console.log('Resultado da busca:', data)
        toast.success(`Encontrados ${data.totalRegistros} resultados`)
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
            Encontre produtos por GTIN, descrição ou NCM em estabelecimentos de Alagoas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="gtin">GTIN/Código de Barras</Label>
              <Input
                id="gtin"
                value={gtin}
                onChange={(e) => setGtin(e.target.value)}
                placeholder="7891000100103"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrição do Produto</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Leite integral"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ncm">NCM</Label>
              <Input
                id="ncm"
                value={ncm}
                onChange={(e) => setNcm(e.target.value)}
                placeholder="04011010"
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Município</Label>
                <Select value={municipality} onValueChange={setMunicipality}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um município" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(MUNICIPIOS_ALAGOAS).map(([code, name]) => (
                      <SelectItem key={code} value={code}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ do Estabelecimento (Opcional)</Label>
                <Input
                  id="cnpj"
                  placeholder="00.000.000/0000-00"
                  value={cnpj}
                  onChange={handleCnpjChange}
                  maxLength={18}
                />
              </div>
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
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {productSearchMutation.data.conteudo.map((item, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-2">
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
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
