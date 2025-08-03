import { useState, useCallback } from 'react'

export function useUnsavedChanges() {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  const markAsChanged = useCallback(() => {
    setHasUnsavedChanges(true)
  }, [])

  const resetChanges = useCallback(() => {
    setHasUnsavedChanges(false)
  }, [])

  return {
    hasUnsavedChanges,
    markAsChanged,
    resetChanges
  }
}