import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

interface SettingsContextType {
  hasUnsavedChanges: boolean
  setHasUnsavedChanges: (value: boolean) => void
  markAsChanged: () => void
  resetChanges: () => void
  saveChanges: () => Promise<void>
  isSaving: boolean
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const markAsChanged = useCallback(() => {
    setHasUnsavedChanges(true)
  }, [])

  const resetChanges = useCallback(() => {
    setHasUnsavedChanges(false)
  }, [])

  const saveChanges = useCallback(async () => {
    setIsSaving(true)
    try {
      // This will be handled by individual settings components
      setHasUnsavedChanges(false)
    } finally {
      setIsSaving(false)
    }
  }, [])

  return (
    <SettingsContext.Provider value={{
      hasUnsavedChanges,
      setHasUnsavedChanges,
      markAsChanged,
      resetChanges,
      saveChanges,
      isSaving
    }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettingsContext() {
  const context = useContext(SettingsContext)
  if (context === undefined) {
    throw new Error('useSettingsContext must be used within a SettingsProvider')
  }
  return context
}