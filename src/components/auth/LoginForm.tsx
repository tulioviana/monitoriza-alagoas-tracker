
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'
import { AuthHeader } from './AuthHeader'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'

interface LoginFormProps {
  onSwitchToSignUp: () => void
  onSwitchToReset: () => void
}

export function LoginForm({ onSwitchToSignUp, onSwitchToReset }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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
    <div className="space-y-8">
      <AuthHeader 
        title="Bem-vindo de volta"
        description="Faça login para acessar sua conta"
      />
      
      <Card className="shadow-strong">
        <CardContent className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-label-md">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="seu@email.com"
                  className="pl-10 h-12"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-label-md">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="pl-10 pr-10 h-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 h-4 w-4 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full h-12 text-label-lg" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>
          
          <div className="mt-6 space-y-4">
            <div className="text-center">
              <button
                type="button"
                onClick={onSwitchToReset}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                Esqueci minha senha
              </button>
            </div>
            <div className="text-center">
              <span className="text-sm text-muted-foreground">Não tem conta? </span>
              <button
                type="button"
                onClick={onSwitchToSignUp}
                className="text-sm text-primary hover:underline font-medium transition-colors"
              >
                Cadastre-se
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
