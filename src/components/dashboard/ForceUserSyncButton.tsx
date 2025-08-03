import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { RefreshCw } from 'lucide-react'

export function ForceUserSyncButton() {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleForceSync = async () => {
    setIsLoading(true)
    try {
      // Get current user ID
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('Usuário não autenticado')
      }

      // Call the force sync function
      const { data, error } = await supabase
        .rpc('force_user_sync', { p_user_id: user.id })

      if (error) {
        throw error
      }

      console.log('Force sync result:', data)
      
      toast({
        title: "Sincronização Iniciada",
        description: "A sincronização dos seus itens foi iniciada. Os preços serão atualizados em alguns minutos.",
      })
    } catch (error) {
      console.error('Error forcing sync:', error)
      toast({
        variant: "destructive",
        title: "Erro na Sincronização",
        description: error instanceof Error ? error.message : "Erro ao iniciar sincronização",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button 
      onClick={handleForceSync} 
      disabled={isLoading}
      variant="outline"
      className="gap-2"
    >
      <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
      {isLoading ? 'Sincronizando...' : 'Forçar Sincronização'}
    </Button>
  )
}