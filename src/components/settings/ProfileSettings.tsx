
import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { SettingsCard } from './SettingsCard'
import { Camera, Upload } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useProfilePicture } from '@/hooks/useProfilePicture'
import { useSettingsContext } from '@/contexts/SettingsContext'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

export function ProfileSettings() {
  const { user, updateUser } = useAuth()
  const { uploadFile, captureFromCamera, isUploading } = useProfilePicture()
  const { hasUnsavedChanges, markAsChanged, resetChanges } = useSettingsContext()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [companyName, setCompanyName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [initialData, setInitialData] = useState({ fullName: '', email: '', companyName: '' })

  useEffect(() => {
    if (user) {
      // Load profile data
      const loadProfile = async () => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        
        if (profile) {
          const initialValues = {
            fullName: profile.full_name || '',
            email: user.email || '',
            companyName: profile.app_name || ''
          }
          setInitialData(initialValues)
          setFullName(initialValues.fullName)
          setEmail(initialValues.email)
          setCompanyName(initialValues.companyName)
          setAvatarUrl(profile.avatar_url || '')
        }
      }
      loadProfile()
    }
  }, [user])

  useEffect(() => {
    const hasChanges = 
      fullName !== initialData.fullName ||
      companyName !== initialData.companyName
    
    if (hasChanges) {
      markAsChanged()
    }
  }, [fullName, companyName, initialData, markAsChanged])

  const handleSave = async () => {
    if (!user) return
    
    try {
      // First, update the public profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          app_name: companyName,
        })
        .eq('id', user.id)

      if (profileError) throw profileError

      // Then, update the user metadata in auth
      await updateUser({ 
        full_name: fullName,
        app_name: companyName
      })
      
      setInitialData({ fullName, email, companyName })
      resetChanges()
      toast.success('Perfil salvo com sucesso!')
    } catch (error: any) {
      toast.error('Erro ao salvar perfil: ' + error.message)
    }
  }

  const handleCancel = () => {
    setFullName(initialData.fullName)
    setEmail(initialData.email)
    setCompanyName(initialData.companyName)
    resetChanges()
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const url = await uploadFile(file)
      if (url) {
        setAvatarUrl(url)
      }
    }
  }

  const handleCameraCapture = async () => {
    const url = await captureFromCamera()
    if (url) {
      setAvatarUrl(url)
    }
  }

  const getUserInitials = () => {
    const name = fullName || email
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Configurações do Perfil</h1>
        <p className="text-muted-foreground">Gerencie suas informações pessoais e preferências</p>
      </div>

      <SettingsCard
        title="Informações Pessoais"
        description="Atualize seus dados pessoais"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-6">
            <Avatar size="xl">
              <AvatarImage src={avatarUrl} alt="Foto do perfil" />
              <AvatarFallback>{getUserInitials()}</AvatarFallback>
            </Avatar>
            
            <div className="flex flex-col gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                <Upload className="w-4 h-4 mr-2" />
                {isUploading ? 'Carregando...' : 'Carregar Foto'}
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleCameraCapture}
                disabled={isUploading}
              >
                <Camera className="w-4 h-4 mr-2" />
                Câmera
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="fullName">Nome Completo</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value)
                  markAsChanged()
                }}
                placeholder="Digite seu nome completo"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Digite seu email"
                disabled
              />
            </div>
          </div>
        </div>
      </SettingsCard>

      <SettingsCard
        title="Informações da Empresa"
        description="Configure os dados da sua empresa ou estabelecimento"
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="companyName">Nome da Empresa</Label>
              <Input
                id="companyName"
                value={companyName}
                onChange={(e) => {
                  setCompanyName(e.target.value)
                  markAsChanged()
                }}
                placeholder="Digite o nome da sua empresa"
              />
          </div>
        </div>
      </SettingsCard>

      {hasUnsavedChanges && (
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleCancel}>Cancelar</Button>
          <Button onClick={handleSave}>Salvar Alterações</Button>
        </div>
      )}
    </div>
  )
}
