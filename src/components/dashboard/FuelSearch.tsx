
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useFuelSearch } from '@/hooks/useSefazAPI'
import { Loader2, Fuel, Building2, MapPin, Search } from 'lucide-react'

const FUEL_TYPES = {
  '487': 'Etanol',
  '320': 'Gasolina Comum',
  '321': 'Gasolina Aditivada',
  '516': 'Diesel Comum',
  '517': 'Diesel S-10'
}

export function FuelSearch() {
  const [fuelType, setFuelType] = useState('320')
  const [cnpj, setCnpj] = useState('')
  const [ibgeCode, setIbgeCode] = useState('')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [radius, setRadius] = useState('10')
  const [days, setDays] = useState('3')
  const [searchType, setSearchType] = useState<'cnpj' | 'ibge' | 'geo'>('ibge')

  const fuelSearch = useFuelSearch()

  const handleSearch = () => {
    const searchParams = {
      produto: {
        tipoCombustivel: parseInt(fuelType)
      },
      estabelecimento: {
        ...(searchType === 'cnpj' && cnpj && { 
          individual: { cnpj: cnpj.replace(/\D/g, '') }
        }),
        ...(searchType === 'ibge' && ibgeCode && { 
          municipio: { codigoIBGE: ibgeCode.replace(/\D/g, '') }
        }),
        ...(searchType === 'geo' && latitude && longitude && {
          geolocalizacao: {
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
            raio: parseInt(radius)
          }
        })
      },
      dias: parseInt(days),
      registrosPorPagina: 100
    }

    console.log('Iniciando busca de combustível:', searchParams)
    fuelSearch.mutate(searchParams)
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Fuel className="w-5 h-5" />
          Buscar Combustíveis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Tipo de Combustível */}
        <div className="space-y-4">
          <h3 className="font-medium flex items-center gap-2">
            <Search className="w-4 h-4" />
            Tipo de Combustível
          </h3>
          
          <div>
            <Label htmlFor="fuel-type">Combustível</Label>
            <Select value={fuelType} onValueChange={setFuelType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(FUEL_TYPES).map(([code, name]) => (
                  <SelectItem key={code} value={code}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Critérios do Estabelecimento */}
        <div className="space-y-4">
          <h3 className="font-medium flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Critérios do Estabelecimento
          </h3>

          <div>
            <Label>Tipo de Busca</Label>
            <Select value={searchType} onValueChange={(value: 'cnpj' | 'ibge' | 'geo') => setSearchType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cnpj">Por CNPJ Específico</SelectItem>
                <SelectItem value="ibge">Por Município (IBGE)</SelectItem>
                <SelectItem value="geo">Por Localização (GPS)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {searchType === 'cnpj' && (
            <div>
              <Label htmlFor="cnpj">CNPJ do Estabelecimento</Label>
              <Input
                id="cnpj"
                value={cnpj}
                onChange={(e) => setCnpj(e.target.value)}
                placeholder="Ex: 11.222.333/0001-81"
              />
            </div>
          )}

          {searchType === 'ibge' && (
            <div>
              <Label htmlFor="ibge">Código IBGE do Município</Label>
              <Input
                id="ibge"
                value={ibgeCode}
                onChange={(e) => setIbgeCode(e.target.value)}
                placeholder="Ex: 3550308 (São Paulo/SP)"
              />
            </div>
          )}

          {searchType === 'geo' && (
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Label htmlFor="latitude">Latitude</Label>
                <Input
                  id="latitude"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  placeholder="Ex: -23.5505"
                />
              </div>
              <div>
                <Label htmlFor="longitude">Longitude</Label>
                <Input
                  id="longitude"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  placeholder="Ex: -46.6333"
                />
              </div>
              <div>
                <Label htmlFor="radius">Raio (km)</Label>
                <Select value={radius} onValueChange={setRadius}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 km</SelectItem>
                    <SelectItem value="10">10 km</SelectItem>
                    <SelectItem value="20">20 km</SelectItem>
                    <SelectItem value="50">50 km</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        {/* Configurações da Busca */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="days">Dias da Pesquisa</Label>
            <Select value={days} onValueChange={setDays}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 dia</SelectItem>
                <SelectItem value="3">3 dias</SelectItem>
                <SelectItem value="5">5 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button 
          onClick={handleSearch} 
          disabled={fuelSearch.isPending}
          className="w-full"
        >
          {fuelSearch.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Search className="w-4 h-4 mr-2" />
          )}
          {fuelSearch.isPending ? 'Buscando...' : 'Buscar Combustíveis'}
        </Button>

        {fuelSearch.data && (
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm">
              <strong>Resultados:</strong> {fuelSearch.data.totalRegistros} resultado(s) encontrado(s)
            </p>
            {fuelSearch.data.conteudo.slice(0, 3).map((item, index) => (
              <div key={index} className="mt-2 text-sm text-muted-foreground">
                • {FUEL_TYPES[fuelType as keyof typeof FUEL_TYPES]} - {item.estabelecimento.nomeFantasia} - R$ {item.produto.venda.valorVenda.toFixed(2)}
              </div>
            ))}
            {fuelSearch.data.conteudo.length > 3 && (
              <p className="text-xs text-muted-foreground mt-2">
                ... e mais {fuelSearch.data.conteudo.length - 3} resultado(s)
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
