'use client'

import { useState } from 'react'
import { TicketQAWithDetails } from '@/types'

interface Props {
  tracklistId: string
  initialTickets?: TicketQAWithDetails[]
}

export function TicketsGrid({ tracklistId, initialTickets = [] }: Props) {
  const [tickets] = useState<TicketQAWithDetails[]>(initialTickets)

  return (
    <div className="mt-8">
      <div className="border rounded-lg p-8 text-center text-muted-foreground min-h-[200px] flex items-center justify-center">
        {tickets.length === 0 ? (
          <span>No hay tickets en este tracklist</span>
        ) : (
          <span>Aquí irá la tabla tipo Excel ({tickets.length} tickets)</span>
        )}
      </div>
    </div>
  )
}
