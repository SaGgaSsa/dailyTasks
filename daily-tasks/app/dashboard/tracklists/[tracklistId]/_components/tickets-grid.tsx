'use client'

import { useEffect, useState } from 'react'
import { getTicketsByTracklist } from '@/app/actions/tracklists'
import { TicketQAWithDetails } from '@/types'

interface Props {
  tracklistId: string
}

export function TicketsGrid({ tracklistId }: Props) {
  const [tickets, setTickets] = useState<TicketQAWithDetails[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsLoading(true)
    getTicketsByTracklist(tracklistId).then(result => {
      if (result.success && result.data) {
        setTickets(result.data)
      }
      setIsLoading(false)
    })
  }, [tracklistId])

  return (
    <div className="mt-8">
      <h2 className="text-xl font-semibold mb-4">Hallazgos y Tickets</h2>
      <div className="border rounded-lg p-8 text-center text-muted-foreground min-h-[200px] flex items-center justify-center">
        {isLoading ? (
          <span>Cargando tickets...</span>
        ) : tickets.length === 0 ? (
          <span>No hay tickets en este tracklist</span>
        ) : (
          <span>Aquí irá la tabla tipo Excel ({tickets.length} tickets)</span>
        )}
      </div>
    </div>
  )
}
