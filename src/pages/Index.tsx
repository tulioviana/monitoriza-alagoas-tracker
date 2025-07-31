
import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { AuthWrapper } from '@/components/auth/AuthWrapper'
import { Dashboard } from '@/components/dashboard/Dashboard'

const Index = () => {
  const { user, loading } = useAuth()
  const [currentTab, setCurrentTab] = useState('dashboard')

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user) {
    return <AuthWrapper />
  }

  return <Dashboard onTabChange={setCurrentTab} />
}

export default Index
