'use client'

import { useState } from 'react'
import { TracklistHeader } from './tracklist-header'
import { TicketsGrid } from './tickets-grid'
import { TicketQAWithDetails } from '@/types'
import { AssignableUser } from '@/app/actions/user-actions'

interface TracklistIncidence {
  id: number
  type: string
  externalId: number
  title: string
}

interface TracklistData {
  id: number
  title: string
  description: string | null
  dueDate: Date | null
  incidences: TracklistIncidence[]
}

interface Props {
  tracklists: { id: number; title: string }[]
  currentId: number
  assignableUsers: AssignableUser[]
  currentTracklist: TracklistData
  incidences: TracklistIncidence[]
  initialTickets: TicketQAWithDetails[]
}

export function TracklistViewClient({
  tracklists,
  currentId,
  assignableUsers,
  currentTracklist,
  incidences,
  initialTickets,
}: Props) {
  const [view, setView] = useState<'list' | 'kanban'>('list')

  return (
    <>
      <TracklistHeader
        tracklists={tracklists}
        currentId={currentId}
        assignableUsers={assignableUsers}
        currentTracklist={currentTracklist}
        incidences={incidences}
        view={view}
        onViewChange={setView}
      />
      <TicketsGrid
        initialTickets={initialTickets}
        assignableUsers={assignableUsers}
        view={view}
      />
    </>
  )
}
