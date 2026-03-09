'use client'

import { useState, useEffect } from 'react'
import { TracklistHeader } from './tracklist-header'
import { TicketsGrid } from './tickets-grid'
import { TicketQAWithDetails } from '@/types'
import { AssignableUser } from '@/app/actions/user-actions'
import { useNavbarBreadcrumbs } from '@/components/providers/navbar-breadcrumb-provider'

interface Props {
  currentId: number
  title: string
  assignableUsers: AssignableUser[]
  initialTickets: TicketQAWithDetails[]
}

export function TracklistViewClient({
  currentId,
  title,
  assignableUsers,
  initialTickets,
}: Props) {
  const { setBreadcrumbs } = useNavbarBreadcrumbs()

  useEffect(() => {
    setBreadcrumbs([
      { label: 'Tracklists', href: '/tracklists' },
      { label: title },
    ])
    return () => setBreadcrumbs([])
  }, [title, setBreadcrumbs])

  const [view, setView] = useState<'list' | 'kanban'>('list')
  const [selectedStatus, setSelectedStatus] = useState<string[]>([])
  const [selectedUser, setSelectedUser] = useState<string[]>([])
  const [selectedTech, setSelectedTech] = useState<string[]>([])

  return (
    <>
      <TracklistHeader
        currentId={currentId}
        assignableUsers={assignableUsers}
        view={view}
        onViewChange={setView}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
        selectedUser={selectedUser}
        onUserChange={setSelectedUser}
        selectedTech={selectedTech}
        onTechChange={setSelectedTech}
      />
      <TicketsGrid
        initialTickets={initialTickets}
        assignableUsers={assignableUsers}
        view={view}
        selectedStatus={selectedStatus}
        selectedUser={selectedUser}
        selectedTech={selectedTech}
      />
    </>
  )
}
