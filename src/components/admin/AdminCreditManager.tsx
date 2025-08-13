import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Search, User, CreditCard, Plus, History } from 'lucide-react'
import { Loader2 } from 'lucide-react'

interface UserResult {
  id: string
  email: string
  full_name: string
  current_balance: number
}

interface CreditTransaction {
  id: string
  transaction_type: string
  amount: number
  description: string | null
  created_at: string
  user_id: string
}

export function AdminCreditManager() {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<UserResult[]>([])
  const [selectedUser, setSelectedUser] = useState<UserResult | null>(null)
  const [creditAmount, setCreditAmount] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)
  const [recentTransactions, setRecentTransactions] = useState<CreditTransaction[]>([])
  const { toast } = useToast()

  const isValidUUID = (str: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    return uuidRegex.test(str)
  }

  const searchUsers = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Digite um email, nome ou ID para buscar",
        variant: "destructive",
      })
      return
    }

    setSearching(true)
    setSearchResults([])

    try {
      let results: UserResult[] = []

      // Buscar por UUID primeiro
      if (isValidUUID(searchQuery.trim())) {
        const { data: uuidResult, error: uuidError } = await supabase
          .rpc('search_user_by_id', { user_uuid: searchQuery.trim() })

        if (uuidError) {
          console.error('Error searching by UUID:', uuidError)
        } else if (uuidResult && uuidResult.length > 0) {
          results = uuidResult
        }
      }

      // Se não encontrou por UUID, buscar por email
      if (results.length === 0 && searchQuery.includes('@')) {
        const { data: emailResults, error: emailError } = await supabase
          .rpc('search_users_by_email', { search_email: searchQuery.trim() })

        if (emailError) {
          console.error('Error searching by email:', emailError)
        } else if (emailResults) {
          results = emailResults
        }
      }

      // Se ainda não encontrou, buscar por nome
      if (results.length === 0 && !searchQuery.includes('@') && !isValidUUID(searchQuery.trim())) {
        const { data: nameResults, error: nameError } = await supabase
          .rpc('search_users_by_name', { search_name: searchQuery.trim() })

        if (nameError) {
          console.error('Error searching by name:', nameError)
        } else if (nameResults) {
          results = nameResults
        }
      }

      setSearchResults(results)

      if (results.length === 0) {
        toast({
          title: "Nenhum usuário encontrado",
          description: "Tente buscar por email, nome ou ID válido",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error searching users:', error)
      toast({
        title: "Erro na busca",
        description: "Erro ao buscar usuários. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setSearching(false)
    }
  }

  const addCredits = async () => {
    if (!selectedUser || !creditAmount || parseInt(creditAmount) <= 0) {
      toast({
        title: "Dados inválidos",
        description: "Selecione um usuário e insira uma quantidade válida de créditos",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      const { data, error } = await supabase.rpc('admin_add_credits', {
        p_target_user_id: selectedUser.id,
        p_amount: parseInt(creditAmount),
        p_description: description || 'Créditos adicionados pelo admin'
      })

      if (error) {
        console.error('Error adding credits:', error)
        toast({
          title: "Erro",
          description: error.message || "Erro ao adicionar créditos",
          variant: "destructive",
        })
        return
      }

      if (data) {
        toast({
          title: "Créditos adicionados",
          description: `${creditAmount} créditos foram adicionados para ${selectedUser.full_name || selectedUser.email}`,
        })

        // Atualizar o saldo do usuário selecionado
        setSelectedUser({
          ...selectedUser,
          current_balance: selectedUser.current_balance + parseInt(creditAmount)
        })

        // Limpar formulário
        setCreditAmount('')
        setDescription('')
        
        // Recarregar transações recentes
        await loadRecentTransactions()
      }
    } catch (error) {
      console.error('Error adding credits:', error)
      toast({
        title: "Erro",
        description: "Erro ao adicionar créditos. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const loadRecentTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('credit_transactions')
        .select(`
          id,
          transaction_type,
          amount,
          description,
          created_at,
          user_id
        `)
        .eq('transaction_type', 'admin_adjustment')
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) {
        console.error('Error loading recent transactions:', error)
        return
      }

      setRecentTransactions(data || [])
    } catch (error) {
      console.error('Error loading recent transactions:', error)
    }
  }

  const getTransactionBadgeVariant = (type: string) => {
    switch (type) {
      case 'admin_adjustment': return 'default'
      case 'purchase': return 'secondary'
      case 'consumption': return 'error'
      default: return 'outline'
    }
  }

  const formatTransactionType = (type: string) => {
    switch (type) {
      case 'admin_adjustment': return 'Ajuste Admin'
      case 'purchase': return 'Compra'
      case 'consumption': return 'Consumo'
      default: return type
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <CreditCard className="w-6 h-6 text-primary" />
        <h2 className="text-2xl font-bold">Gestão de Créditos</h2>
      </div>

      <Tabs defaultValue="add-credits">
        <TabsList>
          <TabsTrigger value="add-credits">Adicionar Créditos</TabsTrigger>
          <TabsTrigger value="transactions" onClick={loadRecentTransactions}>
            Transações Recentes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="add-credits" className="space-y-6">
          {/* Busca de Usuários */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5" />
                Buscar Usuário
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label htmlFor="search">Email, Nome ou ID do Usuário</Label>
                  <Input
                    id="search"
                    placeholder="Digite o email, nome ou ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && searchUsers()}
                  />
                </div>
                <Button 
                  onClick={searchUsers} 
                  disabled={searching}
                  className="mt-6"
                >
                  {searching ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                  Buscar
                </Button>
              </div>

              {/* Resultados da busca */}
              {searchResults.length > 0 && (
                <div className="space-y-2">
                  <Label>Resultados da busca:</Label>
                  {searchResults.map((user) => (
                    <div
                      key={user.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedUser?.id === user.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => setSelectedUser(user)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{user.full_name || user.email}</div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                          <div className="text-xs text-muted-foreground">ID: {user.id}</div>
                        </div>
                        <Badge variant="outline">
                          {user.current_balance} créditos
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Adicionar Créditos */}
          {selectedUser && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Adicionar Créditos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-4 h-4" />
                    <span className="font-medium">Usuário Selecionado</span>
                  </div>
                  <div className="text-sm space-y-1">
                    <div><strong>Nome:</strong> {selectedUser.full_name || 'N/A'}</div>
                    <div><strong>Email:</strong> {selectedUser.email}</div>
                    <div><strong>Saldo Atual:</strong> {selectedUser.current_balance} créditos</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="amount">Quantidade de Créditos</Label>
                    <Input
                      id="amount"
                      type="number"
                      min="1"
                      placeholder="Ex: 100"
                      value={creditAmount}
                      onChange={(e) => setCreditAmount(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Descrição (opcional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Motivo da adição de créditos..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <Button 
                  onClick={addCredits} 
                  disabled={loading || !creditAmount}
                  className="w-full"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Plus className="w-4 h-4 mr-2" />
                  )}
                  Adicionar {creditAmount} Créditos
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5" />
                Transações Recentes (Adições Admin)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentTransactions.length === 0 ? (
                <p className="text-muted-foreground text-center py-6">
                  Nenhuma transação recente encontrada
                </p>
              ) : (
                <div className="space-y-3">
                  {recentTransactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={getTransactionBadgeVariant(transaction.transaction_type)}>
                            {formatTransactionType(transaction.transaction_type)}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {new Date(transaction.created_at).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        <div className="text-sm">
                          <strong>Usuário:</strong> {transaction.user_id}
                        </div>
                        {transaction.description && (
                          <div className="text-sm text-muted-foreground">
                            {transaction.description}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className={`font-medium ${
                          transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {transaction.amount > 0 ? '+' : ''}{transaction.amount}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}