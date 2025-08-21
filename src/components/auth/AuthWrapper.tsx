import { useState } from 'react';
import { LoginForm } from './LoginForm';
import { SignUpForm } from './SignUpForm';
import { ResetPasswordForm } from './ResetPasswordForm';
type AuthMode = 'login' | 'signup' | 'reset';
export function AuthWrapper() {
  const [mode, setMode] = useState<AuthMode>('login');
  return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md">
        {/* Logo Section */}
        <div className="text-center mb-4">
          <img src="/whisprice-logo.jpg" alt="Whisprice AL" className="h-40 w-auto mx-auto mb-4" />
          
          
        </div>
        {mode === 'login' && <LoginForm onSwitchToSignUp={() => setMode('signup')} onSwitchToReset={() => setMode('reset')} />}
        {mode === 'signup' && <SignUpForm onSwitchToLogin={() => setMode('login')} />}
        {mode === 'reset' && <ResetPasswordForm onSwitchToLogin={() => setMode('login')} />}
      </div>
    </div>;
}