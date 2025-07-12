
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Loader2, MapPin, Plus } from 'lucide-react'
import { useFuelSearch } from '@/hooks/useSefazAPI'
import { MUNICIPIOS_ALAGOAS, TIPOS_COMBUSTIVEL } from '@/lib/constants'
import { toast } from 'sonner'

export function FuelSearch() {
  const [fuelType, setFuelType] = useState('')
  const [establishmentType, setEstablishmentType] = useState<'municipio' | 'geolocalizacao'>('municipio')
  const [municipality, setMunicipality] = useState('')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [radius, setRadius] = useState('5')
  const [days, setDays] = useState('7')

  const fuelSearchMutation = useFuelSearch()

  const handleSearch = () => {
    if (!fuelType) {
      toast.error('Selecione o tipo de combustível')
      return
    }

    if (establishmentType === 'municipio' && !municipality) {
      toast.error('Selecione um município')
      return
    }

    if (establishmentType === 'geolocalizacao' && (!latitude || !longitude)) {
      toast.error('Informe a localização')
      return
    }

    const searchParams = {
      produto: {
        tipoCombustivel: parseInt(fuelType)
      },
      estabelecimento: establishmentType === 'municipio' 
        ? { municipio: { codigoIBGE: municipality } }
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

    fuelSearchMutation.mutate(searchParams, {
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

  return (
    <div className="space-y-6">
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
              <Select value={fuelType} onValueChange={setFuelType}>
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
              <Select value={establishmentType} onValueChange={(value: 'municipio' | 'geolocalizacao') => setEstablishmentType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="municipio">Por Município</SelectItem>
                  <SelectItem value="geolocalizacao">Por Localização</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {establishmentType === 'municipio' ? (
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
            disabled={fuelSearchMutation.isPending}
            className="w-full"
          >
            {fuelSearchMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Buscar Combustíveis
          </Button>
        </CardContent>
      </Card>

      {fuelSearchMutation.data && (
        <Card>
          <CardHeader>
            <CardTitle>Resultados da Busca</CardTitle>
            <CardDescription>
              {fuelSearchMutation.data.totalRegistros} postos encontrados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {fuelSearchMutation.data.conteudo.map((item, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold">{TIPOS_COMBUSTIVEL[parseInt(fuelType) as unknown as keyof typeof TIPOS_COMBUSTIVEL]}</h3>
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

                  <Button size="sm" className="w-full mt-2">
                    <Plus className="h-4 w-4 mr-2" />
                    Monitorar este Combustível
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
