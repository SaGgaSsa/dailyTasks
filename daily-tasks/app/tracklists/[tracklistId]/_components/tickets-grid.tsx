'use client'

import { TicketsGrid as TicketsGridComponent } from '@/components/tracklists/TicketsGrid'
import { TicketQAWithDetails } from '@/types'
import { AssignableUser } from '@/app/actions/user-actions'

interface Props {
  initialTickets: TicketQAWithDetails[]
  assignableUsers: AssignableUser[]
}

export function TicketsGrid({ initialTickets, assignableUsers }: Props) {
  return (
    <TicketsGridComponent 
      initialTickets={initialTickets} 
      assignableUsers={assignableUsers}
    />
  )
}
