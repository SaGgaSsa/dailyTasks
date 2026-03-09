'use client'
import { createContext, useContext, useState, useEffect } from 'react'

const SIDEBAR_STORAGE_KEY = 'dailytasks-sidebar-collapsed'

interface SidebarContextValue {
  isOpen: boolean
  toggle: () => void
}

const SidebarContext = createContext<SidebarContextValue>({
  isOpen: true,
  toggle: () => {},
})

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  // Always start with true to match SSR — corrected after hydration
  const [isOpen, setIsOpen] = useState<boolean>(true)

  useEffect(() => {
    const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY)
    if (stored !== null) setIsOpen(stored === 'true')
  }, [])

  const toggle = () => {
    setIsOpen(prev => {
      const next = !prev
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next))
      return next
    })
  }

  return (
    <SidebarContext.Provider value={{ isOpen, toggle }}>
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  return useContext(SidebarContext)
}
