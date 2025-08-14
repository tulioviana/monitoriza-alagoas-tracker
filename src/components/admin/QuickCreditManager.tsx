import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { Coins, Search, Plus } from 'lucide-react'

interface UserResult {
  id: string
  email: string
  full_name: string
  current_balance: number
}

export function QuickCreditManager() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUser, setSelectedUser] = useState<UserResult | null>(null)
  const [creditAmount, setCreditAmount] = useState('')
  const [transactionType, setTransactionType] = useState<'purchase' | 'admin_adjustment' | 'bonus'>('admin_adjustment')
  const [description, setDescription] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [searchResults, setSearchResults] = useState<UserResult[]>([])
  
  const { user } = useAuth()
  const { toast } = useToast()

  // Helper function to check if string is a valid UUID
  const isValidUUID = (str: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    return uuidRegex.test(str)
  }

  const searchUsers = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Digite um termo de busca",
        variant: "destructive"
      })
      return
    }

    if (!user?.id) {
      toast({
        title: "Erro de autenticação",
        description: "Usuário não autenticado",
        variant: "destructive"
      })
      return
    }
    
    setIsSearching(true)
    setSearchResults([])
    console.log('🔍 QuickCreditManager: Starting search for:', searchQuery, 'Admin ID:', user.id)
    
    try {
      let results: UserResult[] = []

      // Try RPC functions with admin_user_id parameter
      if (isValidUUID(searchQuery.trim())) {
        console.log('🔍 QuickCreditManager: Searching by UUID')
        
        const { data, error } = await supabase.rpc('search_user_by_id', {
          user_uuid: searchQuery.trim(),
          admin_user_id: user.id
        })

        if (error) throw error
        results = data || []
      } else if (searchQuery.includes('@')) {
        console.log('🔍 QuickCreditManager: Searching by email')
        
        const { data, error } = await supabase.rpc('search_users_by_email', {
          search_email: searchQuery,
          admin_user_id: user.id
        })

        if (error) throw error
        results = data || []
      } else {
        console.log('🔍 QuickCreditManager: Searching by name')
        
        const { data, error } = await supabase.rpc('search_users_by_name', {
          search_name: searchQuery,
          admin_user_id: user.id
        })

        if (error) throw error
        results = data || []
      }

      console.log('🔍 QuickCreditManager: Search results:', results)
      setSearchResults(results)
      
      if (results.length === 0) {
        toast({
          title: "Nenhum usuário encontrado",
          description: "Tente buscar por UUID, email ou nome completo."
        })
      } else {
        toast({
          title: "Busca realizada",
          description: `${results.length} usuário(s) encontrado(s)`,
        })
      }
      
    } catch (error: any) {
      console.error('❌ QuickCreditManager: Search error:', error)
      
      // Provide specific error messages based on error type
      if (error.message?.includes('Access denied') || error.message?.includes('Admin privileges required')) {
        toast({
          title: "Acesso negado",
          description: "Você precisa ter privilégios de administrador para buscar usuários.",
          variant: "destructive"
        })
      } else if (error.message?.includes('function') && error.message?.includes('does not exist')) {
        toast({
          title: "Erro do sistema",
          description: "Função de busca não encontrada. Contacte o suporte técnico.",
          variant: "destructive"
        })
      } else {
        toast({
          title: "Erro na busca",
          description: `Erro ao buscar usuários: ${error.message || 'Erro desconhecido'}`,
          variant: "destructive"
        })
      }
      
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const addCredits = async () => {
    if (!selectedUser || !creditAmount || !user?.id) return

    const amount = parseInt(creditAmount)
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Valor inválido",
        description: "Insira uma quantidade válida de créditos.",
        variant: "destructive"
      })
      return
    }

    setIsAdding(true)
    try {
      const { data, error } = await supabase.rpc('add_credits', {
        p_user_id: selectedUser.id,
        p_amount: amount,
        p_transaction_type: transactionType,
        p_description: description || `Créditos adicionados pelo admin - ${transactionType}`,
        p_admin_user_id: user.id
      })

      if (error) {
        console.error('Error adding credits:', error)
        toast({
          title: "Erro",
          description: "Erro ao adicionar créditos. Tente novamente.",
          variant: "destructive"
        })
        return
      }

      toast({
        title: "Créditos adicionados!",
        description: `${amount} créditos adicionados para ${selectedUser.full_name || selectedUser.email}`,
      })

      // Reset form
      setSelectedUser(null)
      setCreditAmount('')
      setDescription('')
      setSearchQuery('')
      setSearchResults([])
      
    } catch (error) {
      console.error('Error adding credits:', error)
      toast({
        title: "Erro",
        description: "Erro ao adicionar créditos. Tente novamente.",
        variant: "destructive"
      })
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coins className="h-5 w-5" />
          Gerenciamento Rápido de Créditos
        </CardTitle>
        <CardDescription>
          Adicione créditos manualmente para usuários específicos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* User Search */}
        <div className="space-y-2">
          <Label htmlFor="user-search">Buscar Usuário</Label>
          <div className="flex gap-2">
            <Input
              id="user-search"
              placeholder="User ID, email ou nome do usuário..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchUsers()}
            />
            <Button 
              onClick={searchUsers} 
              disabled={isSearching || !searchQuery.trim()}
              size="icon"
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="space-y-2">
            <Label>Resultados da Busca</Label>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {searchResults.map((result) => (
                <div
                  key={result.id}
                  className={`p-2 border rounded cursor-pointer transition-colors ${
                    selectedUser?.id === result.id 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => setSelectedUser(result)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{result.full_name}</p>
                      {result.email && (
                        <p className="text-sm text-muted-foreground">{result.email}</p>
                      )}
                    </div>
                    <Badge variant="outline">
                      {result.current_balance} créditos
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Selected User Info */}
        {selectedUser && (
          <div className="p-3 bg-muted/50 rounded border">
            <p className="font-medium">Usuário Selecionado:</p>
            <p className="text-sm">{selectedUser.full_name}</p>
            {selectedUser.email && (
              <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
            )}
            <Badge variant="outline" className="mt-1">
              Saldo atual: {selectedUser.current_balance} créditos
            </Badge>
          </div>
        )}

        {/* Credit Addition Form */}
        {selectedUser && (
          <div className="space-y-4 pt-4 border-t">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="credit-amount">Quantidade de Créditos</Label>
                <Input
                  id="credit-amount"
                  type="number"
                  min="1"
                  placeholder="Ex: 100"
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="transaction-type">Tipo de Transação</Label>
                <Select value={transactionType} onValueChange={(value: any) => setTransactionType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin_adjustment">Ajuste Admin</SelectItem>
                    <SelectItem value="bonus">Bônus</SelectItem>
                    <SelectItem value="purchase">Compra</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Input
                id="description"
                placeholder="Motivo da adição de créditos..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <Button 
              onClick={addCredits} 
              disabled={isAdding || !creditAmount}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              {isAdding ? 'Adicionando...' : 'Adicionar Créditos'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}