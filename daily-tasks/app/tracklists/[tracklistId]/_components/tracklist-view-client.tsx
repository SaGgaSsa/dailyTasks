'use client'

import { useState, useEffect } from 'react'
import { TracklistToolbar, TICKET_STATUS_OPTIONS, TECH_OPTIONS } from '@/app/tracklists/_components/tracklist-toolbar'
import { FilterChips } from '@/components/ui/filter-chips'
import { CreateTicketDialog } from '@/components/tracklists/create-ticket-dialog'
import { TicketsGrid } from './tickets-grid'
import { TicketQAWithDetails } from '@/types'
import { AssignableUser } from '@/app/actions/user-actions'
import { useNavbarBreadcrumbs } from '@/components/providers/navbar-breadcrumb-provider'

interface Props {
  currentId: number
  title: string
  assignableUsers: AssignableUser[]
  initialTickets: TicketQAWithDetails[]
}

export function TracklistViewClient({
  currentId,
  title,
  assignableUsers,
  initialTickets,
}: Props) {
  const { setBreadcrumbs } = useNavbarBreadcrumbs()

  useEffect(() => {
    setBreadcrumbs([
      { label: 'Tracklists', href: '/tracklists' },
      { label: title },
    ])
    return () => setBreadcrumbs([])
  }, [title, setBreadcrumbs])

  const [view, setView] = useState<'list' | 'kanban'>('list')
  const [selectedStatus, setSelectedStatus] = useState<string[]>([])
  const [selectedUser, setSelectedUser] = useState<string[]>([])
  const [selectedTech, setSelectedTech] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [isTicketDialogOpen, setIsTicketDialogOpen] = useState(false)

  return (
    <>
      <div className="flex flex-col gap-2 px-1">
        <TracklistToolbar
          search={search}
          onSearchChange={setSearch}
          selectedStatus={selectedStatus}
          onStatusChange={setSelectedStatus}
          selectedUser={selectedUser}
          onUserChange={setSelectedUser}
          selectedTech={selectedTech}
          onTechChange={setSelectedTech}
          assignableUsers={assignableUsers}
          view={view}
          onViewChange={setView}
          onAdd={() => setIsTicketDialogOpen(true)}
        />
        <FilterChips
          searchQuery={search}
          selectedStatus={selectedStatus}
          selectedAssignee={selectedUser}
          selectedTech={selectedTech}
          statusOptions={TICKET_STATUS_OPTIONS}
          assigneeOptions={assignableUsers.map(u => ({ value: String(u.id), label: u.name || u.username }))}
          techOptions={TECH_OPTIONS}
          onSearchChange={setSearch}
          onStatusChange={setSelectedStatus}
          onAssigneeChange={setSelectedUser}
          onTechChange={setSelectedTech}
          onResetFilters={() => { setSearch(''); setSelectedStatus([]); setSelectedUser([]); setSelectedTech([]) }}
        />
      </div>
      <TicketsGrid
        initialTickets={initialTickets}
        assignableUsers={assignableUsers}
        view={view}
        selectedStatus={selectedStatus}
        selectedUser={selectedUser}
        selectedTech={selectedTech}
        search={search}
      />
      <CreateTicketDialog
        tracklistId={currentId}
        assignableUsers={assignableUsers}
        open={isTicketDialogOpen}
        onOpenChange={setIsTicketDialogOpen}
      />
    </>
  )
}
