'use client'

import { createContext, useContext, useState, useCallback } from 'react'
import { SettingsDialog } from '@/components/settings/settings-dialog'

interface SettingsDialogContextValue {
  isOpen: boolean
  openSettings: () => void
  closeSettings: () => void
}

const SettingsDialogContext = createContext<SettingsDialogContextValue>({
  isOpen: false,
  openSettings: () => {},
  closeSettings: () => {},
})

interface SettingsDialogProviderProps {
  children: React.ReactNode
}

export function SettingsDialogProvider({ children }: SettingsDialogProviderProps) {
  const [isOpen, setIsOpen] = useState(false)

  const openSettings = useCallback(() => setIsOpen(true), [])
  const closeSettings = useCallback(() => setIsOpen(false), [])

  return (
    <SettingsDialogContext.Provider value={{ isOpen, openSettings, closeSettings }}>
      {children}
      <SettingsDialog open={isOpen} onOpenChange={setIsOpen} />
    </SettingsDialogContext.Provider>
  )
}

export function useSettingsDialog() {
  return useContext(SettingsDialogContext)
}
