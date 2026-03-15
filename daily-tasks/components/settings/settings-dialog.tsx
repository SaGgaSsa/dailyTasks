'use client'

import { useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { User, FileText } from 'lucide-react'
import { ExternalWorkItem } from '@prisma/client'
import { getCachedExternalWorkItems } from '@/app/actions/external-work-items'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { SettingsNav, type SettingsSection } from '@/components/settings/settings-nav'
import { AccountProfileSection } from '@/components/settings/account-profile-section'
import { ExternalWorkItemsSection } from '@/components/settings/external-work-items-section'

const SETTINGS_SECTIONS: SettingsSection[] = [
  { id: 'profile', label: 'Perfil', icon: User, groupLabel: 'Cuenta' },
  { id: 'external-work-items', label: 'Trámites', icon: FileText, groupLabel: 'Integraciones', adminOnly: true },
]

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const [activeSection, setActiveSection] = useState('profile')
  const [workItems, setWorkItems] = useState<ExternalWorkItem[]>([])
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'ADMIN'

  const visibleSections = SETTINGS_SECTIONS.filter(
    (s) => !s.adminOnly || isAdmin
  )

  const loadWorkItems = useCallback(async () => {
    const data = await getCachedExternalWorkItems()
    setWorkItems(data)
  }, [])

  const handleSectionSelect = useCallback(async (id: string) => {
    setActiveSection(id)
    if (id === 'external-work-items') {
      await loadWorkItems()
    }
  }, [loadWorkItems])

  const renderSection = () => {
    switch (activeSection) {
      case 'profile':
        return <AccountProfileSection />
      case 'external-work-items':
        return isAdmin ? <ExternalWorkItemsSection items={workItems} onRefresh={loadWorkItems} /> : null
      default:
        return null
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-7xl h-[90vh] p-0" showCloseButton>
        <DialogTitle className="sr-only">Configuración</DialogTitle>
        <div className="flex h-full overflow-hidden">
          <div className="w-56 border-r border-border bg-zinc-900/30 flex-shrink-0 overflow-y-auto">
            <SettingsNav
              sections={visibleSections}
              activeSection={activeSection}
              onSelect={handleSectionSelect}
            />
          </div>
          <div className="flex-1 overflow-auto p-6">
            {renderSection()}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
