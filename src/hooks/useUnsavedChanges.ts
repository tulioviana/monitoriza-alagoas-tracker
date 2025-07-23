import { useEffect, useRef } from 'react'
import { useSettingsContext } from '@/contexts/SettingsContext'

export function useUnsavedChanges<T>(value: T, originalValue: T) {
  const { markAsChanged } = useSettingsContext()
  const isFirstRender = useRef(true)

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    if (JSON.stringify(value) !== JSON.stringify(originalValue)) {
      markAsChanged()
    }
  }, [value, originalValue, markAsChanged])

  return {
    hasChanged: JSON.stringify(value) !== JSON.stringify(originalValue),
    reset: () => {
      // This would be handled by parent component resetting to original values
    }
  }
}