import { useTheme as useNextTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export type ThemeType = 'light' | 'dark' | 'system'
export type DensityType = 'compact' | 'normal' | 'spacious'

export function useTheme() {
  const { theme, setTheme, systemTheme } = useNextTheme()
  const [density, setDensity] = useState<DensityType>('normal')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Load density from localStorage
    const savedDensity = localStorage.getItem('ui-density') as DensityType
    if (savedDensity) {
      setDensity(savedDensity)
    }
  }, [])

  useEffect(() => {
    if (mounted) {
      // Apply density classes to document
      document.documentElement.classList.remove('density-compact', 'density-normal', 'density-spacious')
      document.documentElement.classList.add(`density-${density}`)
      
      // Save to localStorage
      localStorage.setItem('ui-density', density)
    }
  }, [density, mounted])

  const changeDensity = (newDensity: DensityType) => {
    setDensity(newDensity)
  }

  if (!mounted) {
    return {
      theme: 'system' as ThemeType,
      setTheme: () => {},
      density: 'normal' as DensityType,
      setDensity: () => {},
      resolvedTheme: 'light',
      systemTheme: 'light'
    }
  }

  return {
    theme: theme as ThemeType,
    setTheme,
    density,
    setDensity: changeDensity,
    resolvedTheme: theme === 'system' ? systemTheme : theme,
    systemTheme
  }
}