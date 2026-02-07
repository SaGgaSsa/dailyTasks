'use client'

import { useTheme as useNextTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export function useTheme() {
  const { theme, setTheme, resolvedTheme, systemTheme } = useNextTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Función para cambiar el tema que también actualiza localStorage directamente
  const toggleTheme = () => {
    const newTheme = resolvedTheme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
    
    // Asegurar que se guarde en localStorage inmediatamente
    if (typeof window !== 'undefined') {
      localStorage.setItem('dailytasks-theme', newTheme)
      
      // Aplicar clase inmediatamente para evitar delays
      const root = document.documentElement
      if (newTheme === 'dark') {
        root.classList.add('dark')
        root.classList.remove('light')
      } else {
        root.classList.add('light')
        root.classList.remove('dark')
      }
      root.style.colorScheme = newTheme
    }
  }

  return {
    theme,
    resolvedTheme,
    systemTheme,
    mounted,
    toggleTheme,
    setTheme: (newTheme: string) => {
      setTheme(newTheme)
      if (typeof window !== 'undefined') {
        localStorage.setItem('dailytasks-theme', newTheme)
        const root = document.documentElement
        if (newTheme === 'dark') {
          root.classList.add('dark')
          root.classList.remove('light')
        } else if (newTheme === 'light') {
          root.classList.add('light')
          root.classList.remove('dark')
        }
        root.style.colorScheme = newTheme
      }
    },
    isDark: mounted ? resolvedTheme === 'dark' : true, // Default a dark durante SSR
    isLight: mounted ? resolvedTheme === 'light' : false,
  }
}
