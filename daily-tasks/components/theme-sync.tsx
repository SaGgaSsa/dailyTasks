'use client'

import { useEffect } from 'react'
import { useTheme } from '@/lib/use-theme'

// Este componente asegura que el tema se sincronice correctamente
// después de que React hidrate la aplicación
export function ThemeSync() {
  const { resolvedTheme } = useTheme()

  useEffect(() => {
    // Verificar que el tema en el DOM coincida con el estado de React
    const root = document.documentElement
    const hasDarkClass = root.classList.contains('dark')
    const shouldBeDark = resolvedTheme === 'dark'
    
    if (shouldBeDark && !hasDarkClass) {
      root.classList.add('dark')
      root.classList.remove('light')
      root.style.colorScheme = 'dark'
    } else if (!shouldBeDark && hasDarkClass) {
      root.classList.add('light')
      root.classList.remove('dark')
      root.style.colorScheme = 'light'
    }
  }, [resolvedTheme])

  return null
}
