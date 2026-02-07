'use client'

import { useTheme as useNextTheme } from 'next-themes'
import { useEffect, useSyncExternalStore } from 'react'

function subscribe() {
  return () => {}
}

function getSnapshot() {
  return typeof window !== 'undefined' ? localStorage.getItem('dailytasks-theme') : null
}

function getServerSnapshot() {
  return null
}

export function useTheme() {
  const { theme, setTheme, resolvedTheme, systemTheme } = useNextTheme()
  const mounted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot) !== null

  const toggleTheme = () => {
    const newTheme = resolvedTheme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
  }

  return {
    theme,
    resolvedTheme,
    systemTheme,
    mounted,
    toggleTheme,
    setTheme,
    isDark: mounted ? resolvedTheme === 'dark' : true,
    isLight: mounted ? resolvedTheme === 'light' : false,
  }
}
