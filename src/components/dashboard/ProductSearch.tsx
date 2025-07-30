
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useProductSearch } from '@/hooks/useSefazAPI'
import { Loader2, Package, Building2, MapPin, Search } from 'lucide-react'

export function ProductSearch() {
  const [gtin, setGtin] = useState('')
  const [description, setDescription] = useState('')
  const [ncm, setNcm] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [ibgeCode, setIbgeCode] = useState('')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [radius, setRadius] = useState('10')
  const [days, setDays] = useState('3')
  const [searchType, setSearchType] = useState<'cnpj' | 'ibge' | 'geo'>('ibge')

  const productSearch = useProductSearch()

  const handleSearch = () => {
    // Validação básica
    if (!gtin && !description && !ncm) {
      console.error('Pelo menos um critério de busca deve ser preenchido')
      return
    }

    const searchParams = {
      produto: {
        ...(gtin && { gtin }),
        ...(description && { descricao: description }),
        ...(ncm && { ncm })
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

    console.log('Iniciando busca de produtos:', searchParams)
    productSearch.mutate(searchParams)
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5" />
          Buscar Produtos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Critérios do Produto */}
        <div className="space-y-4">
          <h3 className="font-medium flex items-center gap-2">
            <Search className="w-4 h-4" />
            Critérios do Produto
          </h3>
          
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="gtin">GTIN/Código de Barras</Label>
              <Input
                id="gtin"
                value={gtin}
                onChange={(e) => setGtin(e.target.value)}
                placeholder="Ex: 7891000100103"
              />
            </div>

            <div>
              <Label htmlFor="ncm">NCM</Label>
              <Input
                id="ncm"
                value={ncm}
                onChange={(e) => setNcm(e.target.value)}
                placeholder="Ex: 19059090"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Descrição do Produto</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Biscoito recheado chocolate"
              className="min-h-[80px]"
            />
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
          disabled={productSearch.isPending}
          className="w-full"
        >
          {productSearch.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Search className="w-4 h-4 mr-2" />
          )}
          {productSearch.isPending ? 'Buscando...' : 'Buscar Produtos'}
        </Button>

        {productSearch.data && (
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm">
              <strong>Resultados:</strong> {productSearch.data.totalRegistros} produto(s) encontrado(s)
            </p>
            {productSearch.data.conteudo.slice(0, 3).map((item, index) => (
              <div key={index} className="mt-2 text-sm text-muted-foreground">
                • {item.produto.descricao} - {item.estabelecimento.nomeFantasia}
              </div>
            ))}
            {productSearch.data.conteudo.length > 3 && (
              <p className="text-xs text-muted-foreground mt-2">
                ... e mais {productSearch.data.conteudo.length - 3} resultado(s)
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
