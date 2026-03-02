'use client'

import { useState } from 'react'
import { TicketQA } from '@prisma/client'

interface Props {
  tracklistId: string
  initialTickets?: TicketQA[]
}

export function TicketsGrid({ tracklistId, initialTickets = [] }: Props) {
  const [tickets] = useState<TicketQA[]>(initialTickets)

  return (
    <div className="mt-8">
      <div className="border rounded-lg p-8 text-center text-muted-foreground min-h-[200px] flex items-center justify-center">
        {tickets.length === 0 ? (
          <span>No hay tickets en este tracklist</span>
        ) : (
          <span>Grilla de tickets proximamente ({tickets.length} tickets)</span>
        )}
      </div>
    </div>
  )
}
