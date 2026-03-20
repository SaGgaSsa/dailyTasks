'use client'

import { type ReactNode } from 'react'
import { SquircleDashed, BrainCircuit, User } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FilterDropdown } from '@/components/ui/filter-dropdown'
import { FilterToolbar } from '@/components/ui/filter-toolbar'
import { SearchBar } from '@/components/ui/search-bar'
import { AssignableUser } from '@/app/actions/user-actions'
import { TICKET_QA_STATUS_LABELS } from '@/types/enums'

export const TICKET_STATUS_OPTIONS = Object.entries(TICKET_QA_STATUS_LABELS).map(
  ([value, label]) => ({ value, label })
)
export type ViewOption = { value: string; icon: ReactNode }

interface TracklistToolbarProps {
  search: string
  onSearchChange: (v: string) => void
  selectedStatus: string[]
  onStatusChange: (v: string[]) => void
  selectedUser: string[]
  onUserChange: (v: string[]) => void
  selectedTech: string[]
  onTechChange: (v: string[]) => void
  techOptions: { value: string; label: string }[]
  assignableUsers: AssignableUser[]
  view: string
  onViewChange: (v: string) => void
  viewOptions: ViewOption[]
  trailing?: ReactNode
}

export function TracklistToolbar({
  search,
  onSearchChange,
  selectedStatus,
  onStatusChange,
  selectedUser,
  onUserChange,
  selectedTech,
  onTechChange,
  techOptions,
  assignableUsers,
  view,
  onViewChange,
  viewOptions,
  trailing,
}: TracklistToolbarProps) {
  return (
    <FilterToolbar
      startContent={
        <>
          <SearchBar value={search} onChange={onSearchChange} placeholder="Buscar ticket..." />
          <FilterDropdown
            icon={<SquircleDashed className="h-4 w-4" />}
            label="Estado"
            options={TICKET_STATUS_OPTIONS}
            selectedValues={selectedStatus}
            allValues={TICKET_STATUS_OPTIONS.map(o => o.value)}
            onValuesChange={onStatusChange}
          />
          <FilterDropdown
            icon={<User className="h-4 w-4" />}
            label="Usuario"
            options={assignableUsers.map(u => ({ value: String(u.id), label: u.name || u.username }))}
            selectedValues={selectedUser}
            allValues={assignableUsers.map(u => String(u.id))}
            onValuesChange={onUserChange}
          />
          <FilterDropdown
            icon={<BrainCircuit className="h-4 w-4" />}
            label="Tecnología"
            options={techOptions}
            selectedValues={selectedTech}
            allValues={techOptions.map(o => o.value)}
            onValuesChange={onTechChange}
          />
        </>
      }
      endContent={
        <>
          {trailing}
          <Tabs value={view} onValueChange={onViewChange}>
            <TabsList className="bg-muted border border-border h-8">
              {viewOptions.map(opt => (
                <TabsTrigger key={opt.value} value={opt.value} className="data-[state=active]:bg-accent px-3">
                  {opt.icon}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </>
      }
    />
  )
}
