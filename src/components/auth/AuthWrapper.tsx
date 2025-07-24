
import { useState } from 'react'
import { LoginForm } from './LoginForm'
import { SignUpForm } from './SignUpForm'
import { ResetPasswordForm } from './ResetPasswordForm'

type AuthMode = 'login' | 'signup' | 'reset'

export function AuthWrapper() {
  const [mode, setMode] = useState<AuthMode>('login')

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-accent/20">
      <div className="min-h-screen flex">
        {/* Left side - Branding & Info */}
        <div className="hidden lg:flex lg:flex-1 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-primary opacity-90" />
          <div className="relative z-10 flex flex-col justify-center px-12 text-primary-foreground">
            <div className="space-y-8">
              <div>
                <h2 className="text-display-xl mb-4">Whisprice</h2>
                <p className="text-body-lg opacity-90 max-w-md">
                  Monitore preços de combustíveis em tempo real e tome decisões inteligentes para seu negócio.
                </p>
              </div>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-primary-foreground rounded-full mt-2" />
                  <div>
                    <h3 className="font-semibold">Monitoramento em Tempo Real</h3>
                    <p className="text-sm opacity-75">Acompanhe variações de preços instantaneamente</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-primary-foreground rounded-full mt-2" />
                  <div>
                    <h3 className="font-semibold">Análise Competitiva</h3>
                    <p className="text-sm opacity-75">Compare preços com a concorrência</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-primary-foreground rounded-full mt-2" />
                  <div>
                    <h3 className="font-semibold">Decisões Inteligentes</h3>
                    <p className="text-sm opacity-75">Base suas estratégias em dados reais</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Auth Forms */}
        <div className="flex-1 flex items-center justify-center p-4 lg:p-8">
          <div className="w-full max-w-md space-y-8">
            {mode === 'login' && (
              <LoginForm
                onSwitchToSignUp={() => setMode('signup')}
                onSwitchToReset={() => setMode('reset')}
              />
            )}
            {mode === 'signup' && (
              <SignUpForm onSwitchToLogin={() => setMode('login')} />
            )}
            {mode === 'reset' && (
              <ResetPasswordForm onSwitchToLogin={() => setMode('login')} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
