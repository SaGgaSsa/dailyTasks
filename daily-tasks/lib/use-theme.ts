'use client'

import { useTheme as useNextTheme } from 'next-themes'
import { useEffect, useSyncExternalStore } from 'react'

const THEME_COOKIE_NAME = 'dailytasks-theme'

function subscribe() {
  return () => {}
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  return match ? decodeURIComponent(match[2]) : null
}

function setCookie(name: string, value: string): void {
  if (typeof document === 'undefined') return
  const expires = new Date()
  expires.setFullYear(expires.getFullYear() + 1)
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires.toUTCString()};path=/;SameSite=Lax`
}

function getSnapshot() {
  return typeof window !== 'undefined' ? (getCookie(THEME_COOKIE_NAME) || localStorage.getItem(THEME_COOKIE_NAME)) : null
}

function getServerSnapshot() {
  return null
}

export function useTheme() {
  const { theme, setTheme, resolvedTheme, systemTheme } = useNextTheme()
  const mounted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot) !== null

  useEffect(() => {
    if (mounted && resolvedTheme) {
      setCookie(THEME_COOKIE_NAME, resolvedTheme)
    }
  }, [mounted, resolvedTheme])

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
