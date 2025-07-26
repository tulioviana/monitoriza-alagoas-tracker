
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'

interface LoginFormProps {
  onSwitchToSignUp: () => void
  onSwitchToReset: () => void
}

export function LoginForm({ onSwitchToSignUp, onSwitchToReset }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await signIn(email, password)
      toast.success('Login realizado com sucesso!')
    } catch (error: any) {
      toast.error(error.message || 'Erro ao fazer login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold text-primary">Monitoriza Alagoas</CardTitle>
        <CardDescription>Faça login para monitorar preços</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="seu@email.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>
        <div className="mt-4 text-center space-y-2">
          <button
            type="button"
            onClick={onSwitchToReset}
            className="text-sm text-muted-foreground hover:text-primary"
          >
            Esqueci minha senha
          </button>
          <div>
            <span className="text-sm text-muted-foreground">Não tem conta? </span>
            <button
              type="button"
              onClick={onSwitchToSignUp}
              className="text-sm text-primary hover:underline"
            >
              Cadastre-se
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
