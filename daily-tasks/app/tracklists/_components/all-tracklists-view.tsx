'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Eye, Pencil, ClipboardList } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CreateTracklistDialog } from '@/components/tracklists/create-tracklist-dialog'
import { AllTracklistsTicketsTable } from './all-tracklists-tickets-table'
import { FilterChips } from '@/components/ui/filter-chips'
import { TracklistToolbar, TICKET_STATUS_OPTIONS, TECH_OPTIONS } from './tracklist-toolbar'
import { AssignableUser } from '@/app/actions/user-actions'
import { TicketQAWithDetails } from '@/types'
import { getTracklistForEdit } from '@/app/actions/tracklists'

// The shape returned by getAllTracklistsWithTickets
interface TracklistWithTickets {
  id: number
  title: string
  description: string | null
  dueDate: Date | null
  tickets: TicketQAWithDetails[]
}

interface TracklistForEdit {
  id: number
  title: string
  description: string | null
  dueDate: Date | null
}

interface TracklistExternalWorkItem {
  id: number
  type: string
  externalId: number
  title: string | null
}

interface Props {
  tracklists: TracklistWithTickets[]
  assignableUsers: AssignableUser[]
}

export function AllTracklistsView({ tracklists, assignableUsers }: Props) {
  const [search, setSearch] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string[]>([])
  const [selectedUser, setSelectedUser] = useState<string[]>([])
  const [selectedTech, setSelectedTech] = useState<string[]>([])
  const [createTracklistOpen, setCreateTracklistOpen] = useState(false)
  const [editingTracklist, setEditingTracklist] = useState<TracklistForEdit | null>(null)
  const [editWorkItems, setEditWorkItems] = useState<TracklistExternalWorkItem[]>([])
  const [lockedWorkItemIds, setLockedWorkItemIds] = useState<number[]>([])
  const [editOpen, setEditOpen] = useState(false)

  const handleEditTracklist = async (tl: TracklistWithTickets) => {
    const result = await getTracklistForEdit(tl.id)
    if (result.success && result.data) {
      setEditingTracklist({ id: result.data.id, title: result.data.title, description: result.data.description, dueDate: result.data.dueDate })
      setEditWorkItems(result.data.externalWorkItems)
      setLockedWorkItemIds(result.data.lockedWorkItemIds)
      setEditOpen(true)
    }
  }

  return (
    <div className="flex flex-col gap-6 p-4 h-full overflow-auto">
      {/* Toolbar */}
      <div className="flex flex-col gap-2">
        <TracklistToolbar
          search={search}
          onSearchChange={setSearch}
          selectedStatus={selectedStatus}
          onStatusChange={setSelectedStatus}
          selectedUser={selectedUser}
          onUserChange={setSelectedUser}
          selectedTech={selectedTech}
          onTechChange={setSelectedTech}
          assignableUsers={assignableUsers}
          view="list"
          onViewChange={() => {}}
          onAdd={() => setCreateTracklistOpen(true)}
        />
        <FilterChips
          searchQuery={search}
          selectedStatus={selectedStatus}
          selectedAssignee={selectedUser}
          selectedTech={selectedTech}
          statusOptions={TICKET_STATUS_OPTIONS}
          assigneeOptions={assignableUsers.map(u => ({ value: String(u.id), label: u.name || u.username }))}
          techOptions={TECH_OPTIONS}
          onSearchChange={setSearch}
          onStatusChange={setSelectedStatus}
          onAssigneeChange={setSelectedUser}
          onTechChange={setSelectedTech}
          onResetFilters={() => { setSearch(''); setSelectedStatus([]); setSelectedUser([]); setSelectedTech([]) }}
        />
      </div>

      {/* Tracklists */}
      {tracklists.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
          <ClipboardList className="h-10 w-10 opacity-30" />
          <p className="text-sm">No hay tracklists. Crea uno con el botón de arriba.</p>
        </div>
      ) : (
        tracklists.map((tl) => (
          <div key={tl.id} className="flex flex-col gap-3">
            {/* Section header */}
            <div className="flex items-center justify-between">
              <div className="flex items-baseline gap-2">
                <h2 className="text-base font-semibold">{tl.title}</h2>
                {tl.description && (
                  <p className="text-sm text-muted-foreground">{tl.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Link href={`/tracklists/${tl.id}`}>
                  <Button variant="ghost" size="icon" className="h-8 w-8" title="Ver tracklist">
                    <Eye className="h-4 w-4" />
                  </Button>
                </Link>
                <Button variant="ghost" size="icon" className="h-8 w-8" title="Editar tracklist"
                  onClick={() => handleEditTracklist(tl)}>
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Tickets table */}
            <AllTracklistsTicketsTable
              tickets={tl.tickets.filter(t => {
                if (search && !t.description.toLowerCase().includes(search.toLowerCase())) return false
                if (selectedStatus.length > 0 && !selectedStatus.includes(t.status)) return false
                if (selectedUser.length > 0 && !selectedUser.includes(String(t.assignedToId ?? ''))) return false
                if (selectedTech.length > 0 && !selectedTech.includes(t.module.technology.name)) return false
                return true
              })}
              assignableUsers={assignableUsers}
            />
          </div>
        ))
      )}

      {/* Dialogs */}
      <CreateTracklistDialog
        open={createTracklistOpen}
        onOpenChange={setCreateTracklistOpen}
      />

      {editingTracklist && (
        <CreateTracklistDialog
          open={editOpen}
          onOpenChange={(open) => {
            setEditOpen(open)
            if (!open) { setEditingTracklist(null); setEditWorkItems([]); setLockedWorkItemIds([]) }
          }}
          tracklist={editingTracklist}
          externalWorkItems={editWorkItems}
          lockedWorkItemIds={lockedWorkItemIds}
        />
      )}

    </div>
  )
}
