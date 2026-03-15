'use client'

import { type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface SettingsSection {
  id: string
  label: string
  icon: LucideIcon
  groupLabel: string
  adminOnly?: boolean
}

interface SettingsNavProps {
  sections: SettingsSection[]
  activeSection: string
  onSelect: (id: string) => void
}

export function SettingsNav({ sections, activeSection, onSelect }: SettingsNavProps) {
  const groups = sections.reduce<Record<string, SettingsSection[]>>((acc, section) => {
    const group = section.groupLabel
    return { ...acc, [group]: [...(acc[group] || []), section] }
  }, {})

  return (
    <nav className="py-4 space-y-4">
      {Object.entries(groups).map(([groupLabel, groupSections]) => (
        <div key={groupLabel} className="px-3">
          <div className="px-3 py-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
            {groupLabel}
          </div>
          <div className="space-y-0.5">
            {groupSections.map((section) => {
              const Icon = section.icon
              return (
                <Button
                  key={section.id}
                  variant="ghost"
                  className={cn(
                    'w-full justify-start gap-3 text-sm font-normal',
                    activeSection === section.id
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                  onClick={() => onSelect(section.id)}
                >
                  <Icon className="h-4 w-4" />
                  {section.label}
                </Button>
              )
            })}
          </div>
        </div>
      ))}
    </nav>
  )
}
