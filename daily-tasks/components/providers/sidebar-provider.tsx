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

function readFromStorage(): boolean {
  if (typeof window === 'undefined') return true
  const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY)
  return stored !== null ? stored === 'true' : true
}

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState<boolean>(readFromStorage)

  useEffect(() => {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, String(isOpen))
  }, [isOpen])

  const toggle = () => setIsOpen(prev => !prev)

  return (
    <SidebarContext.Provider value={{ isOpen, toggle }}>
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  return useContext(SidebarContext)
}
