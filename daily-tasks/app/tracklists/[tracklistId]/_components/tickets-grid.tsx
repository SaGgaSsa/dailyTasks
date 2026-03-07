'use client'

import { TicketsGrid as TicketsGridComponent } from '@/components/tracklists/TicketsGrid'
import { TicketKanbanBoard } from '@/components/tracklists/TicketKanbanBoard'
import { TicketQAWithDetails } from '@/types'
import { AssignableUser } from '@/app/actions/user-actions'

interface Props {
  initialTickets: TicketQAWithDetails[]
  assignableUsers: AssignableUser[]
  view: 'list' | 'kanban'
}

export function TicketsGrid({ initialTickets, assignableUsers, view }: Props) {
  if (view === 'kanban') {
    return <TicketKanbanBoard tickets={initialTickets} />
  }
  return (
    <TicketsGridComponent
      initialTickets={initialTickets}
      assignableUsers={assignableUsers}
    />
  )
}
