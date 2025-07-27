
import { useState } from 'react'
import { LoginForm } from './LoginForm'
import { SignUpForm } from './SignUpForm'
import { ResetPasswordForm } from './ResetPasswordForm'

type AuthMode = 'login' | 'signup' | 'reset'

export function AuthWrapper() {
  const [mode, setMode] = useState<AuthMode>('login')

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md">
        {/* Logo Section */}
        <div className="text-center mb-8">
          <img 
            src="/lovable-uploads/6a3a2835-069d-490f-a741-e7fc3101bc4e.png" 
            alt="Whisprice AL" 
            className="h-20 w-auto mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-slate-800">Whisprice AL</h1>
          <p className="text-slate-600 text-sm">Monitoramento inteligente de preços</p>
        </div>
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
  )
}
