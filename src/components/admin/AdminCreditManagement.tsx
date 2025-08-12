import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { Coins, Plus, Minus, History, Users } from 'lucide-react'

interface UserCredit {
  user_id: string
  current_balance: number
  total_purchased: number
  total_consumed: number
  email?: string
  full_name?: string
}

interface CreditTransaction {
  id: string
  user_id: string
  transaction_type: 'purchase' | 'consumption' | 'admin_adjustment' | 'refund' | 'bonus'
  amount: number
  description: string | null
  created_at: string
  email?: string
  full_name?: string
}

export function AdminCreditManagement() {
  const [users, setUsers] = useState<UserCredit[]>([])
  const [transactions, setTransactions] = useState<CreditTransaction[]>([])
  const [selectedUserId, setSelectedUserId] = useState('')
  const [creditAmount, setCreditAmount] = useState('')
  const [transactionType, setTransactionType] = useState<'admin_adjustment' | 'bonus'>('admin_adjustment')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('user_credits')
        .select(`
          user_id,
          current_balance,
          total_purchased,
          total_consumed
        `)
        .order('current_balance', { ascending: false })

      if (error) throw error

      // Get profile data separately
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name')

      if (profileError) throw profileError

      const usersWithProfiles = data.map(user => {
        const profile = profileData?.find(p => p.id === user.user_id)
        return {
          ...user,
          full_name: profile?.full_name
        }
      })

      setUsers(usersWithProfiles)
    } catch (error) {
      console.error('Error fetching users:', error)
      toast({
        title: "Erro",
        description: "Erro ao carregar usuários",
        variant: "destructive",
      })
    }
  }

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('credit_transactions')
        .select(`
          id,
          user_id,
          transaction_type,
          amount,
          description,
          created_at
        `)
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error

      // Get profile data separately
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name')

      if (profileError) throw profileError

      const transactionsWithProfiles = data.map(transaction => {
        const profile = profileData?.find(p => p.id === transaction.user_id)
        return {
          ...transaction,
          full_name: profile?.full_name
        }
      })

      setTransactions(transactionsWithProfiles)
    } catch (error) {
      console.error('Error fetching transactions:', error)
      toast({
        title: "Erro",
        description: "Erro ao carregar transações",
        variant: "destructive",
      })
    }
  }

  const addCredits = async () => {
    if (!selectedUserId || !creditAmount) {
      toast({
        title: "Erro",
        description: "Selecione um usuário e insira o valor",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.rpc('add_credits', {
        p_user_id: selectedUserId,
        p_amount: parseInt(creditAmount),
        p_transaction_type: transactionType,
        p_description: description || `Créditos adicionados pelo admin`,
        p_admin_user_id: (await supabase.auth.getUser()).data.user?.id
      })

      if (error) throw error

      toast({
        title: "Sucesso",
        description: "Créditos adicionados com sucesso",
      })

      setCreditAmount('')
      setDescription('')
      await fetchUsers()
      await fetchTransactions()
    } catch (error) {
      console.error('Error adding credits:', error)
      toast({
        title: "Erro",
        description: "Erro ao adicionar créditos",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
    fetchTransactions()
  }, [])

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case 'purchase': return 'bg-green-100 text-green-800'
      case 'consumption': return 'bg-red-100 text-red-800'
      case 'admin_adjustment': return 'bg-blue-100 text-blue-800'
      case 'bonus': return 'bg-purple-100 text-purple-800'
      case 'refund': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getTransactionTypeLabel = (type: string) => {
    switch (type) {
      case 'purchase': return 'Compra'
      case 'consumption': return 'Consumo'
      case 'admin_adjustment': return 'Ajuste Admin'
      case 'bonus': return 'Bônus'
      case 'refund': return 'Reembolso'
      default: return type
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Coins className="h-5 w-5 text-primary" />
        <h2 className="text-2xl font-bold">Gerenciamento de Créditos</h2>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Usuários
          </TabsTrigger>
          <TabsTrigger value="transactions" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Transações
          </TabsTrigger>
          <TabsTrigger value="add-credits" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Adicionar Créditos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-medium mb-4">Saldo de Créditos por Usuário</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Saldo Atual</TableHead>
                    <TableHead>Total Comprado</TableHead>
                    <TableHead>Total Consumido</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.user_id}>
                      <TableCell className="font-medium">
                        {user.full_name || 'N/A'}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={user.current_balance > 10 ? 'default' : user.current_balance > 0 ? 'secondary' : 'error'}>
                          {user.current_balance}
                        </Badge>
                      </TableCell>
                      <TableCell>{user.total_purchased}</TableCell>
                      <TableCell>{user.total_consumed}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="transactions">
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-medium mb-4">Histórico de Transações</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Descrição</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        {new Date(transaction.created_at).toLocaleString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{transaction.full_name || 'N/A'}</div>
                          <div className="text-sm text-muted-foreground">{transaction.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getTransactionTypeColor(transaction.transaction_type)}>
                          {getTransactionTypeLabel(transaction.transaction_type)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className={transaction.amount > 0 ? 'text-green-600' : 'text-red-600'}>
                          {transaction.amount > 0 ? '+' : ''}{transaction.amount}
                        </span>
                      </TableCell>
                      <TableCell>{transaction.description || 'N/A'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="add-credits">
          <Card>
            <div className="p-6 space-y-4">
              <h3 className="text-lg font-medium">Adicionar Créditos</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="user-select">Selecionar Usuário</Label>
                  <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um usuário" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.user_id} value={user.user_id}>
                          {user.full_name || user.email} - {user.current_balance} créditos
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="credit-amount">Quantidade de Créditos</Label>
                  <Input
                    id="credit-amount"
                    type="number"
                    value={creditAmount}
                    onChange={(e) => setCreditAmount(e.target.value)}
                    placeholder="Ex: 100"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="transaction-type">Tipo de Transação</Label>
                  <Select value={transactionType} onValueChange={(value: 'admin_adjustment' | 'bonus') => setTransactionType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin_adjustment">Ajuste Administrativo</SelectItem>
                      <SelectItem value="bonus">Bônus</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição (Opcional)</Label>
                  <Input
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Motivo da adição de créditos"
                  />
                </div>
              </div>

              <Button 
                onClick={addCredits} 
                disabled={loading || !selectedUserId || !creditAmount}
                className="w-full"
              >
                {loading ? 'Adicionando...' : 'Adicionar Créditos'}
              </Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}