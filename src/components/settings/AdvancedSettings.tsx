
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { SettingsCard } from './SettingsCard'
import { Sun, Moon } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'
import { useSettingsContext } from '@/contexts/SettingsContext'
import { toast } from 'sonner'

export function AdvancedSettings() {
  const { theme, setTheme: setAppTheme } = useTheme()
  const { hasUnsavedChanges, resetChanges } = useSettingsContext()
  
  const [localTheme, setLocalTheme] = useState(theme === 'system' ? 'light' : theme)
  const [initialData, setInitialData] = useState({ theme: theme === 'system' ? 'light' : theme })

  useUnsavedChanges({ theme: localTheme }, initialData)

  useEffect(() => {
    const currentTheme = theme === 'system' ? 'light' : theme
    setInitialData({ theme: currentTheme })
    setLocalTheme(currentTheme)
  }, [theme])

  const handleSave = () => {
    setAppTheme(localTheme)
    setInitialData({ theme: localTheme })
    resetChanges()
    toast.success('Configurações de aparência salvas!')
  }

  const handleCancel = () => {
    setLocalTheme(initialData.theme)
    resetChanges()
  }

  const getThemeIcon = (themeValue: string) => {
    switch (themeValue) {
      case 'light':
        return <Sun className="w-4 h-4 mr-2" />
      case 'dark':
        return <Moon className="w-4 h-4 mr-2" />
      default:
        return <Sun className="w-4 h-4 mr-2" />
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Configurações de Aparência</h1>
        <p className="text-muted-foreground">Personalize a interface do sistema</p>
      </div>

      <SettingsCard
        title="Tema"
        description="Escolha o tema visual da aplicação"
      >
        <div className="space-y-6">
          <div>
            <Label className="text-sm font-medium">Tema</Label>
            <RadioGroup value={localTheme} onValueChange={(value) => setLocalTheme(value as any)} className="mt-2">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="light" id="light" />
                <Label htmlFor="light" className="flex items-center">
                  {getThemeIcon('light')}
                  Claro
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="dark" id="dark" />
                <Label htmlFor="dark" className="flex items-center">
                  {getThemeIcon('dark')}
                  Escuro
                </Label>
              </div>
            </RadioGroup>
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
