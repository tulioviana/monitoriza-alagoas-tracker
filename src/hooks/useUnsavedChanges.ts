import { useEffect, useRef } from 'react'
import { useSettingsContext } from '@/contexts/SettingsContext'

export function useUnsavedChanges<T>(value: T, initialValue?: T) {
  const { markAsChanged } = useSettingsContext()
  const initialValueRef = useRef(initialValue ?? value)
  const isFirstRender = useRef(true)

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    if (JSON.stringify(value) !== JSON.stringify(initialValueRef.current)) {
      markAsChanged()
    }
  }, [value, markAsChanged])

  return {
    hasChanged: JSON.stringify(value) !== JSON.stringify(initialValueRef.current),
    reset: () => {
      initialValueRef.current = value
    }
  }
}