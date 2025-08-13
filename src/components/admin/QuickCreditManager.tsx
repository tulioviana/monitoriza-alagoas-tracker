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
    if (!searchQuery.trim()) return
    
    setIsSearching(true)
    console.log('🔍 QuickCreditManager: Searching for users with query:', searchQuery)
    
    try {
      let searchResults: UserResult[] = []

      // First, check if the search query is a UUID (user ID)
      if (isValidUUID(searchQuery.trim())) {
        console.log('🔍 QuickCreditManager: Query appears to be UUID, searching by user ID...')
        
        const { data: userById, error: userByIdError } = await supabase.rpc('search_user_by_id', {
          user_uuid: searchQuery.trim()
        })

        console.log('🔍 QuickCreditManager: User ID search result:', { userById, userByIdError })

        if (!userByIdError && userById && userById.length > 0) {
          searchResults = userById
        }
      }

      // If no results from UUID search, try email search
      if (searchResults.length === 0) {
        console.log('🔍 QuickCreditManager: Attempting to search by email...')
        
        const { data: emailResults, error: emailError } = await supabase.rpc('search_users_by_email', {
          search_email: searchQuery
        })

        console.log('🔍 QuickCreditManager: Email search result:', { emailResults, emailError })

        if (!emailError && emailResults && emailResults.length > 0) {
          searchResults = emailResults
        }
      }

      // If still no results, try name search
      if (searchResults.length === 0) {
        console.log('🔍 QuickCreditManager: Attempting to search by name...')
        
        const { data: nameResults, error: nameError } = await supabase.rpc('search_users_by_name', {
          search_name: searchQuery
        })

        console.log('🔍 QuickCreditManager: Name search result:', { nameResults, nameError })

        if (!nameError && nameResults && nameResults.length > 0) {
          searchResults = nameResults
        }
      }

      setSearchResults(searchResults)
      
      if (searchResults.length === 0) {
        toast({
          title: "Nenhum usuário encontrado",
          description: "Tente buscar por User ID (UUID), email ou nome completo.",
          variant: "destructive"
        })
      } else {
        toast({
          title: "Busca realizada",
          description: `${searchResults.length} usuário(s) encontrado(s)`,
        })
      }
      
    } catch (error) {
      console.error('❌ QuickCreditManager: Exception during search:', error)
      toast({
        title: "Erro na busca",
        description: "Erro inesperado ao buscar usuários",
        variant: "destructive",
      })
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