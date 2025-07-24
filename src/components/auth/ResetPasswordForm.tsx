
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'
import { AuthHeader } from './AuthHeader'
import { Mail, ArrowLeft } from 'lucide-react'

interface ResetPasswordFormProps {
  onSwitchToLogin: () => void
}

export function ResetPasswordForm({ onSwitchToLogin }: ResetPasswordFormProps) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const { resetPassword } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await resetPassword(email)
      toast.success('Email de recuperação enviado! Verifique sua caixa de entrada.')
      onSwitchToLogin()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao enviar email de recuperação')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <AuthHeader 
        title="Recuperar senha"
        description="Digite seu email para receber instruções de recuperação"
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
            <Button type="submit" className="w-full h-12 text-label-lg" disabled={loading}>
              {loading ? 'Enviando...' : 'Enviar Email de Recuperação'}
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="inline-flex items-center text-sm text-primary hover:underline font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao login
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
