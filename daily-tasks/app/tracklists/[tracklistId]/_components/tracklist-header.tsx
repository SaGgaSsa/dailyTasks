'use client'

import { useState } from 'react'
import { ListTodo, LayoutDashboard, BrainCircuit, User } from 'lucide-react'
import { CreateTicketDialog } from '@/components/tracklists/create-ticket-dialog'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AssignableUser } from '@/app/actions/user-actions'
import { FilterDropdown } from '@/components/ui/filter-dropdown'
import { TICKET_QA_STATUS_LABELS } from '@/types/enums'

const TICKET_STATUS_OPTIONS = Object.entries(TICKET_QA_STATUS_LABELS).map(
  ([value, label]) => ({ value, label })
)
const TECH_OPTIONS = [
  { value: 'SISA', label: 'SISA' },
  { value: 'WEB', label: 'WEB' },
  { value: 'ANDROID', label: 'ANDROID' },
  { value: 'ANGULAR', label: 'ANGULAR' },
  { value: 'SPRING', label: 'SPRING' },
]

interface Props {
  currentId: number
  assignableUsers: AssignableUser[]
  view: 'list' | 'kanban'
  onViewChange: (v: 'list' | 'kanban') => void
  selectedStatus: string[]
  onStatusChange: (v: string[]) => void
  selectedUser: string[]
  onUserChange: (v: string[]) => void
  selectedTech: string[]
  onTechChange: (v: string[]) => void
}

export function TracklistHeader({ currentId, assignableUsers, view, onViewChange, selectedStatus, onStatusChange, selectedUser, onUserChange, selectedTech, onTechChange }: Props) {
  const [isTicketDialogOpen, setIsTicketDialogOpen] = useState(false)

  return (
    <>
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-4">
          <FilterDropdown
            icon={<LayoutDashboard className="h-4 w-4" />}
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
            onClick={() => setIsTicketDialogOpen(true)}
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
      <CreateTicketDialog
        tracklistId={currentId}
        assignableUsers={assignableUsers}
        open={isTicketDialogOpen}
        onOpenChange={setIsTicketDialogOpen}
      />
    </>
  )
}
