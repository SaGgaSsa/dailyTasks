'use client'

import { TicketsGrid as TicketsGridComponent } from '@/components/tracklists/TicketsGrid'
import { TicketQAWithDetails } from '@/types'

interface Props {
  initialTickets: TicketQAWithDetails[]
}

export function TicketsGrid({ initialTickets }: Props) {
  return (
    <TicketsGridComponent 
      initialTickets={initialTickets} 
    />
  )
}
