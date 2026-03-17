'use client'

import { useState, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { User, FileText, CalendarDays, Blocks, Layers } from 'lucide-react'
import { Module, Technology } from '@prisma/client'
import { getExternalWorkItems, getExternalWorkItemsSettingsData, getWorkItemTypes } from '@/app/actions/external-work-items'
import { getTechsAndModulesForSettings } from '@/app/actions/tech'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { SettingsNav, type SettingsSection } from '@/components/settings/settings-nav'
import { AccountProfileSection } from '@/components/settings/account-profile-section'
import { ExternalWorkItemsSection } from '@/components/settings/external-work-items-section'
import { CalendarSection } from '@/components/settings/calendar-section'
import { TechModulesSection } from '@/components/settings/tech-modules-section'
import { WorkItemTypesSection } from '@/components/settings/work-item-types-section'
import type { ExternalWorkItemSummary, WorkItemTypeOption } from '@/types'

const SETTINGS_SECTIONS: SettingsSection[] = [
  { id: 'profile', label: 'Perfil', icon: User, groupLabel: 'Cuenta' },
  { id: 'work-item-types', label: 'Tipos de trámite', icon: FileText, groupLabel: 'Integraciones' },
  { id: 'external-work-items', label: 'Trámites', icon: FileText, groupLabel: 'Integraciones' },
  { id: 'calendar', label: 'Calendario', icon: CalendarDays, groupLabel: 'Administración' },
  { id: 'technologies', label: 'Tecnologías', icon: Layers, groupLabel: 'Administración' },
  { id: 'modules', label: 'Módulos', icon: Blocks, groupLabel: 'Administración' },
]

interface TechnologyWithModules extends Technology {
  modules: Module[]
}

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const [activeSection, setActiveSection] = useState('profile')
  const [workItems, setWorkItems] = useState<ExternalWorkItemSummary[]>([])
  const [workItemTypes, setWorkItemTypes] = useState<WorkItemTypeOption[]>([])
  const [techs, setTechs] = useState<TechnologyWithModules[]>([])
  const workItemsRequestRef = useRef<Promise<void> | null>(null)
  const workItemsSettingsRequestRef = useRef<Promise<void> | null>(null)
  const workItemTypesRequestRef = useRef<Promise<void> | null>(null)
  const techsRequestRef = useRef<Promise<void> | null>(null)
  const { data: session } = useSession()
  const userRole = session?.user?.role
  const isAdmin = userRole === 'ADMIN'
  const canManageWorkItems = userRole === 'ADMIN' || userRole === 'QA'
  const canManageCalendar = userRole === 'ADMIN' || userRole === 'QA'
  const canManageTechModules = userRole === 'ADMIN' || userRole === 'QA'

  const visibleSections = SETTINGS_SECTIONS.filter(
    (s) => !s.adminOnly || isAdmin
  )

  const loadWorkItems = useCallback(async () => {
    if (workItemsRequestRef.current) {
      return workItemsRequestRef.current
    }

    const request = (async () => {
      const data = await getExternalWorkItems()
      setWorkItems(data)
    })()

    workItemsRequestRef.current = request

    try {
      await request
    } finally {
      workItemsRequestRef.current = null
    }
  }, [])

  const loadWorkItemTypes = useCallback(async () => {
    if (workItemTypesRequestRef.current) {
      return workItemTypesRequestRef.current
    }

    const request = (async () => {
      const data = await getWorkItemTypes()
      setWorkItemTypes(data)
    })()

    workItemTypesRequestRef.current = request

    try {
      await request
    } finally {
      workItemTypesRequestRef.current = null
    }
  }, [])

  const loadWorkItemsSettingsData = useCallback(async () => {
    if (workItemsSettingsRequestRef.current) {
      return workItemsSettingsRequestRef.current
    }

    const request = (async () => {
      const data = await getExternalWorkItemsSettingsData()
      setWorkItems(data.workItems)
      setWorkItemTypes(data.workItemTypes)
    })()

    workItemsSettingsRequestRef.current = request

    try {
      await request
    } finally {
      workItemsSettingsRequestRef.current = null
    }
  }, [])

  const loadTechsAndModules = useCallback(async () => {
    if (techsRequestRef.current) {
      return techsRequestRef.current
    }

    const request = (async () => {
      const result = await getTechsAndModulesForSettings()
      if (result.success && result.data) {
        setTechs(result.data.techs)
      }
    })()

    techsRequestRef.current = request

    try {
      await request
    } finally {
      techsRequestRef.current = null
    }
  }, [])

  const handleSectionSelect = useCallback(async (id: string) => {
    if (id === activeSection) {
      return
    }

    setActiveSection(id)
    if (id === 'work-item-types') {
      await loadWorkItemTypes()
    }
    if (id === 'external-work-items') {
      await loadWorkItemsSettingsData()
    }
    if (id === 'technologies' || id === 'modules') {
      await loadTechsAndModules()
    }
  }, [activeSection, loadTechsAndModules, loadWorkItemTypes, loadWorkItemsSettingsData])

  const renderSection = () => {
    switch (activeSection) {
      case 'profile':
        return <AccountProfileSection />
      case 'work-item-types':
        return <WorkItemTypesSection items={workItemTypes} onRefresh={loadWorkItemTypes} canManage={canManageWorkItems} />
      case 'external-work-items':
        return <ExternalWorkItemsSection items={workItems} workItemTypes={workItemTypes} onRefresh={loadWorkItemsSettingsData} canManage={canManageWorkItems} />
      case 'calendar':
        return <CalendarSection readOnly={!canManageCalendar} />
      case 'technologies':
        return <TechModulesSection techs={techs} onRefresh={loadTechsAndModules} canManage={canManageTechModules} mode="technologies" />
      case 'modules':
        return <TechModulesSection techs={techs} onRefresh={loadTechsAndModules} canManage={canManageTechModules} mode="modules" />
      default:
        return null
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-7xl h-[90vh] p-0" showCloseButton>
        <DialogTitle className="sr-only">Configuración</DialogTitle>
        <div className="flex h-full overflow-hidden">
          <div className="w-56 border-r border-border bg-muted/50 dark:bg-zinc-900/30 flex-shrink-0 overflow-y-auto">
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
