'use client'

import { TicketsGrid as TicketsGridComponent } from '@/components/tracklists/TicketsGrid'
import { TicketKanbanBoard } from '@/components/tracklists/TicketKanbanBoard'
import { TicketQAWithDetails } from '@/types'
import { AssignableUser } from '@/app/actions/user-actions'

interface Props {
  initialTickets: TicketQAWithDetails[]
  assignableUsers: AssignableUser[]
  view: 'list' | 'kanban'
  selectedStatus: string[]
  selectedUser: string[]
  selectedTech: string[]
}

export function TicketsGrid({ initialTickets, assignableUsers, view, selectedStatus, selectedUser, selectedTech }: Props) {
  const filteredTickets = initialTickets.filter((t) => {
    if (selectedStatus.length > 0 && !selectedStatus.includes(t.status)) return false
    if (selectedUser.length > 0 && !selectedUser.includes(String(t.assignedToId ?? ''))) return false
    if (selectedTech.length > 0 && !selectedTech.includes(t.module.technology.name)) return false
    return true
  })

  if (view === 'kanban') {
    return <TicketKanbanBoard tickets={filteredTickets} assignableUsers={assignableUsers} />
  }
  return (
    <TicketsGridComponent
      initialTickets={filteredTickets}
      assignableUsers={assignableUsers}
    />
  )
}
