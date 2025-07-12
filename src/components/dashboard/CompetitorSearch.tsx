import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Building2, Search, Plus, Loader2, Eye, EyeOff, Trash2 } from 'lucide-react'
import { useAddCompetitorTracking, useCompetitorTracking, useToggleCompetitorTracking, useDeleteCompetitorTracking } from '@/hooks/useCompetitorTracking'

export function CompetitorSearch() {
  const [cnpj, setCnpj] = useState('')
  const [competitorName, setCompetitorName] = useState('')

  const { data: competitors, isLoading } = useCompetitorTracking()
  const addMutation = useAddCompetitorTracking()
  const toggleMutation = useToggleCompetitorTracking()
  const deleteMutation = useDeleteCompetitorTracking()

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

  const handleAddCompetitor = () => {
    if (!cnpj) return
    
    const cleanCnpj = cnpj.replace(/\D/g, '')
    addMutation.mutate({ 
      cnpj: cleanCnpj, 
      name: competitorName || undefined 
    }, {
      onSuccess: () => {
        setCnpj('')
        setCompetitorName('')
      }
    })
  }

  const handleToggleCompetitor = (id: number, currentStatus: boolean) => {
    toggleMutation.mutate({ id, is_active: !currentStatus })
  }

  const handleDeleteCompetitor = (id: number) => {
    if (confirm('Tem certeza que deseja remover este concorrente do monitoramento?')) {
      deleteMutation.mutate(id)
    }
  }

  return (
    <div className="space-y-6">
      {/* Add New Competitor */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Adicionar Concorrente
          </CardTitle>
          <CardDescription>
            Adicione um concorrente pelo CNPJ para monitorar seus preços
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cnpj">CNPJ do Concorrente</Label>
              <Input
                id="cnpj"
                placeholder="00.000.000/0000-00"
                value={cnpj}
                onChange={handleCnpjChange}
                maxLength={18}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Estabelecimento (Opcional)</Label>
              <Input
                id="name"
                placeholder="Nome para identificação"
                value={competitorName}
                onChange={(e) => setCompetitorName(e.target.value)}
              />
            </div>
          </div>
          <Button 
            onClick={handleAddCompetitor}
            disabled={!cnpj || addMutation.isPending}
            className="w-full md:w-auto"
          >
            {addMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Adicionar Concorrente
          </Button>
        </CardContent>
      </Card>

      {/* Tracked Competitors */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Concorrentes Monitorados
          </CardTitle>
          <CardDescription>
            Lista de concorrentes que você está monitorando
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Carregando concorrentes...</span>
            </div>
          ) : !competitors || competitors.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum concorrente monitorado</h3>
              <p className="text-muted-foreground">
                Adicione concorrentes pelo CNPJ para monitorar seus preços
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {competitors.map((competitor) => (
                <div key={competitor.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold">
                        {competitor.competitor_name || 'Concorrente'}
                      </h4>
                      <Badge variant={competitor.is_active ? 'default' : 'secondary'}>
                        {competitor.is_active ? 'Ativo' : 'Pausado'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      CNPJ: {formatCnpj(competitor.competitor_cnpj)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Adicionado em: {new Date(competitor.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleCompetitor(competitor.id, competitor.is_active)}
                      disabled={toggleMutation.isPending}
                    >
                      {toggleMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : competitor.is_active ? (
                        <>
                          <EyeOff className="h-4 w-4 mr-1" />
                          Pausar
                        </>
                      ) : (
                        <>
                          <Eye className="h-4 w-4 mr-1" />
                          Ativar
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteCompetitor(competitor.id)}
                      disabled={deleteMutation.isPending}
                    >
                      {deleteMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}