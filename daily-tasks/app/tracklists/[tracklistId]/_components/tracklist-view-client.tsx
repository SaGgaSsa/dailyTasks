'use client'

import { useState } from 'react'
import { TracklistHeader } from './tracklist-header'
import { TicketsGrid } from './tickets-grid'
import { TicketQAWithDetails } from '@/types'
import { AssignableUser } from '@/app/actions/user-actions'

interface TracklistExternalWorkItem {
  id: number
  type: string
  externalId: number
  title: string | null
}

interface TracklistData {
  id: number
  title: string
  description: string | null
  dueDate: Date | null
  externalWorkItems: TracklistExternalWorkItem[]
}

interface Props {
  tracklists: { id: number; title: string }[]
  currentId: number
  assignableUsers: AssignableUser[]
  currentTracklist: TracklistData
  externalWorkItems: TracklistExternalWorkItem[]
  initialTickets: TicketQAWithDetails[]
}

export function TracklistViewClient({
  tracklists,
  currentId,
  assignableUsers,
  currentTracklist,
  externalWorkItems,
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
        externalWorkItems={externalWorkItems}
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
