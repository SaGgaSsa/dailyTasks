'use client'
import { createContext, useContext, useState } from 'react'

const SIDEBAR_COOKIE_KEY = 'dailytasks-sidebar-open'

interface SidebarContextValue {
  isOpen: boolean
  toggle: () => void
}

const SidebarContext = createContext<SidebarContextValue>({
  isOpen: true,
  toggle: () => {},
})

interface SidebarProviderProps {
  children: React.ReactNode
  defaultOpen?: boolean
}

export function SidebarProvider({ children, defaultOpen = true }: SidebarProviderProps) {
  const [isOpen, setIsOpen] = useState<boolean>(defaultOpen)

  const toggle = () => {
    setIsOpen(prev => {
      const next = !prev
      document.cookie = `${SIDEBAR_COOKIE_KEY}=${next};path=/;max-age=31536000;SameSite=Lax`
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
