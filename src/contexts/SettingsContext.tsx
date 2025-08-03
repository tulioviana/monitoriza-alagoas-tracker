import { createContext, useContext, useCallback, useState } from 'react'

interface SettingsContextType {
  hasUnsavedChanges: boolean
  markAsChanged: () => void
  resetChanges: () => void
}

const SettingsContext = createContext<SettingsContextType | null>(null)

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  const markAsChanged = useCallback(() => {
    setHasUnsavedChanges(true)
  }, [])

  const resetChanges = useCallback(() => {
    setHasUnsavedChanges(false)
  }, [])

  return (
    <SettingsContext.Provider value={{
      hasUnsavedChanges,
      markAsChanged,
      resetChanges
    }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettingsContext() {
  const context = useContext(SettingsContext)
  if (!context) {
    throw new Error('useSettingsContext must be used within a SettingsProvider')
  }
  return context
}