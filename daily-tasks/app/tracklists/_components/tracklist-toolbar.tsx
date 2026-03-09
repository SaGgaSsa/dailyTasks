'use client'

import { ListTodo, LayoutDashboard, SquircleDashed, BrainCircuit, User, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FilterDropdown } from '@/components/ui/filter-dropdown'
import { SearchBar } from '@/components/ui/search-bar'
import { AssignableUser } from '@/app/actions/user-actions'
import { TICKET_QA_STATUS_LABELS } from '@/types/enums'

export const TICKET_STATUS_OPTIONS = Object.entries(TICKET_QA_STATUS_LABELS).map(
  ([value, label]) => ({ value, label })
)
export const TECH_OPTIONS = [
  { value: 'SISA', label: 'SISA' },
  { value: 'WEB', label: 'WEB' },
  { value: 'ANDROID', label: 'ANDROID' },
  { value: 'ANGULAR', label: 'ANGULAR' },
  { value: 'SPRING', label: 'SPRING' },
]

interface TracklistToolbarProps {
  search: string
  onSearchChange: (v: string) => void
  selectedStatus: string[]
  onStatusChange: (v: string[]) => void
  selectedUser: string[]
  onUserChange: (v: string[]) => void
  selectedTech: string[]
  onTechChange: (v: string[]) => void
  assignableUsers: AssignableUser[]
  view: 'list' | 'kanban'
  onViewChange: (v: 'list' | 'kanban') => void
  onAdd: () => void
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
  assignableUsers,
  view,
  onViewChange,
  onAdd,
}: TracklistToolbarProps) {
  return (
    <div className="flex items-center justify-between px-1">
      <div className="flex items-center gap-4">
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
          options={TECH_OPTIONS}
          selectedValues={selectedTech}
          allValues={TECH_OPTIONS.map(o => o.value)}
          onValuesChange={onTechChange}
        />
      </div>
      <div className="flex items-center gap-2">
        <Button
          className="bg-primary hover:bg-primary/90 text-primary-foreground h-8 w-8 p-0"
          onClick={onAdd}
        >
          <Plus className="h-4 w-4" />
        </Button>
        <Tabs value={view} onValueChange={(v) => onViewChange(v as 'list' | 'kanban')}>
          <TabsList className="bg-muted border border-border h-8">
            <TabsTrigger value="list" className="data-[state=active]:bg-accent px-3">
              <ListTodo className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger value="kanban" className="data-[state=active]:bg-accent px-3">
              <LayoutDashboard className="h-4 w-4" />
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </div>
  )
}
