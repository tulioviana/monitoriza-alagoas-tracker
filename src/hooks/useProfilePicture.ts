
import { useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'

export function useProfilePicture() {
  const [isUploading, setIsUploading] = useState(false)
  const { user } = useAuth()

  const uploadFile = async (file: File) => {
    if (!user) {
      toast.error('Você precisa estar logado para fazer upload')
      return null
    }

    setIsUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const timestamp = new Date().getTime()
      const fileName = `${user.id}/avatar-${timestamp}.${fileExt}`

      // Delete all existing avatars for this user
      const { data: existingFiles } = await supabase.storage
        .from('avatars')
        .list(user.id)
      
      if (existingFiles && existingFiles.length > 0) {
        const filesToDelete = existingFiles.map(file => `${user.id}/${file.name}`)
        await supabase.storage.from('avatars').remove(filesToDelete)
      }

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file)

      if (uploadError) {
        throw uploadError
      }

      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: data.publicUrl })
        .eq('id', user.id)

      if (updateError) {
        throw updateError
      }

      toast.success('Foto de perfil atualizada com sucesso!')
      
      // Force refresh of user data
      window.location.reload()
      
      return data.publicUrl
    } catch (error: any) {
      toast.error('Erro ao fazer upload da foto: ' + error.message)
      return null
    } finally {
      setIsUploading(false)
    }
  }

  const captureFromCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 300, height: 300 } 
      })
      
      return new Promise<string | null>((resolve) => {
        const video = document.createElement('video')
        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d')
        
        video.srcObject = stream
        video.play()
        
        video.onloadedmetadata = () => {
          canvas.width = 300
          canvas.height = 300
          
          // Create modal for camera capture
          const modal = document.createElement('div')
          modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
            background: rgba(0,0,0,0.8); display: flex; align-items: center; 
            justify-content: center; z-index: 9999;
          `
          
          const container = document.createElement('div')
          container.style.cssText = `
            background: white; padding: 20px; border-radius: 10px; 
            text-align: center;
          `
          
          video.style.cssText = 'width: 300px; height: 300px; object-fit: cover;'
          
          const captureBtn = document.createElement('button')
          captureBtn.textContent = 'Capturar'
          captureBtn.style.cssText = `
            margin: 10px; padding: 10px 20px; background: #3b82f6; 
            color: white; border: none; border-radius: 5px; cursor: pointer;
          `
          
          const cancelBtn = document.createElement('button')
          cancelBtn.textContent = 'Cancelar'
          cancelBtn.style.cssText = `
            margin: 10px; padding: 10px 20px; background: #6b7280; 
            color: white; border: none; border-radius: 5px; cursor: pointer;
          `
          
          captureBtn.onclick = () => {
            context?.drawImage(video, 0, 0, 300, 300)
            canvas.toBlob(async (blob) => {
              if (blob) {
                const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' })
                const url = await uploadFile(file)
                resolve(url)
              } else {
                resolve(null)
              }
              stream.getTracks().forEach(track => track.stop())
              document.body.removeChild(modal)
            }, 'image/jpeg', 0.8)
          }
          
          cancelBtn.onclick = () => {
            stream.getTracks().forEach(track => track.stop())
            document.body.removeChild(modal)
            resolve(null)
          }
          
          container.appendChild(video)
          container.appendChild(document.createElement('br'))
          container.appendChild(captureBtn)
          container.appendChild(cancelBtn)
          modal.appendChild(container)
          document.body.appendChild(modal)
        }
      })
    } catch (error) {
      toast.error('Erro ao acessar a câmera')
      return null
    }
  }

  return {
    uploadFile,
    captureFromCamera,
    isUploading
  }
}
