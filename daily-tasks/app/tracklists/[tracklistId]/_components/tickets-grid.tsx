'use client'

import { TicketsGrid as TicketsGridComponent } from '@/components/tracklists/TicketsGrid'
import { TicketQAWithDetails } from '@/types'

interface Props {
  tracklistId: string
  initialTickets: TicketQAWithDetails[]
}

export function TicketsGrid({ tracklistId, initialTickets }: Props) {
  return (
    <TicketsGridComponent 
      tracklistId={tracklistId} 
      initialTickets={initialTickets} 
    />
  )
}
