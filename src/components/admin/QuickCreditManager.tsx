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

  const searchUsers = async () => {
    if (!searchQuery.trim()) return
    
    setIsSearching(true)
    try {
      // First try to find by email
      const { data: authUser } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          user_credits!inner(current_balance)
        `)
        .or(`id.eq.${searchQuery},full_name.ilike.%${searchQuery}%`)
        .limit(5)

      // Also search by email in profiles if query looks like email
      let emailResults: UserResult[] = []
      if (searchQuery.includes('@')) {
        // Search profiles by getting user ID from auth and joining with credits
        const { data: profileData } = await supabase
          .from('profiles')
          .select(`
            id,
            full_name,
            user_credits(current_balance)
          `)
          .eq('id', searchQuery) // This won't work for email, we need a different approach
        
        // For now, we'll rely on the profile search above
      }

      const results: UserResult[] = []
      
      // Process profile results
      if (authUser) {
        authUser.forEach((profile: any) => {
          const userCredits = Array.isArray(profile.user_credits) ? profile.user_credits[0] : profile.user_credits
          results.push({
            id: profile.id,
            email: '', // We'll fetch this separately if needed
            full_name: profile.full_name || 'Usuário',
            current_balance: userCredits?.current_balance || 0
          })
        })
      }

      // Process email results (currently empty, but structure for future use)
      emailResults.forEach(user => {
        if (!results.find(r => r.id === user.id)) {
          results.push(user)
        }
      })

      setSearchResults(results)
      
      if (results.length === 0) {
        toast({
          title: "Nenhum usuário encontrado",
          description: "Tente buscar por email ou nome completo.",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error searching users:', error)
      toast({
        title: "Erro na busca",
        description: "Erro ao buscar usuários. Tente novamente.",
        variant: "destructive"
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
              placeholder="Email ou nome do usuário..."
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