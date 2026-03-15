'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, Pencil, ClipboardList, CheckCircle2, Archive, ListTodo, GanttChart as GanttChartIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { CreateTracklistDialog } from '@/components/tracklists/create-tracklist-dialog'
import { AllTracklistsTicketsTable } from './all-tracklists-tickets-table'
import { GanttChart } from './gantt/gantt-chart'
import { FilterChips } from '@/components/ui/filter-chips'
import { TracklistToolbar, TICKET_STATUS_OPTIONS, TECH_OPTIONS, type ViewOption } from './tracklist-toolbar'
import { AssignableUser } from '@/app/actions/user-actions'
import { TicketQAWithDetails, GanttTracklist } from '@/types'
import { getTracklistForEdit, completeTracklist, archiveTracklist } from '@/app/actions/tracklists'
import { TracklistStatus, TRACKLIST_STATUS_LABELS } from '@/types/enums'
import { toast } from 'sonner'

// The shape returned by getAllTracklistsWithTickets
interface TracklistWithTickets {
  id: number
  title: string
  description: string | null
  dueDate: Date | null
  status: string
  completedAt: Date | null
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
  ganttData: GanttTracklist[]
  assignableUsers: AssignableUser[]
}

const ALL_TRACKLISTS_VIEW_OPTIONS: ViewOption[] = [
  { value: 'list', icon: <ListTodo className="h-4 w-4" /> },
  { value: 'gantt', icon: <GanttChartIcon className="h-4 w-4" /> },
]

export function AllTracklistsView({ tracklists, ganttData, assignableUsers }: Props) {
  const [view, setView] = useState<'list' | 'gantt'>('list')
  const [search, setSearch] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string[]>([])
  const [selectedUser, setSelectedUser] = useState<string[]>([])
  const [selectedTech, setSelectedTech] = useState<string[]>([])
  const [createTracklistOpen, setCreateTracklistOpen] = useState(false)
  const [editingTracklist, setEditingTracklist] = useState<TracklistForEdit | null>(null)
  const [editWorkItems, setEditWorkItems] = useState<TracklistExternalWorkItem[]>([])
  const [lockedWorkItemIds, setLockedWorkItemIds] = useState<number[]>([])
  const [editOpen, setEditOpen] = useState(false)
  const [completeTarget, setCompleteTarget] = useState<number | null>(null)
  const [archiveTarget, setArchiveTarget] = useState<number | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleCompleteTracklist = () => {
    if (!completeTarget) return
    startTransition(async () => {
      const result = await completeTracklist(completeTarget)
      setCompleteTarget(null)
      if (result.success) {
        toast.success('Tracklist completado')
        router.refresh()
      } else {
        toast.error(result.error || 'Error al completar')
      }
    })
  }

  const handleArchiveTracklist = () => {
    if (!archiveTarget) return
    startTransition(async () => {
      const result = await archiveTracklist(archiveTarget)
      setArchiveTarget(null)
      if (result.success) {
        toast.success('Tracklist archivado')
        router.refresh()
      } else {
        toast.error(result.error || 'Error al archivar')
      }
    })
  }

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
    <div className="flex flex-col gap-6 h-full overflow-auto">
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
          view={view}
          onViewChange={(v) => setView(v as 'list' | 'gantt')}
          viewOptions={ALL_TRACKLISTS_VIEW_OPTIONS}
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
      {view === 'gantt' ? (
        <GanttChart tracklists={ganttData} />
      ) : tracklists.length === 0 ? (
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
                {tl.status !== TracklistStatus.ACTIVE && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    tl.status === TracklistStatus.COMPLETED
                      ? 'bg-green-500/15 text-green-400'
                      : 'bg-zinc-500/15 text-zinc-400'
                  }`}>
                    {TRACKLIST_STATUS_LABELS[tl.status as TracklistStatus]}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {tl.status === TracklistStatus.ACTIVE && tl.tickets.length > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-green-500 hover:text-green-400"
                    title="Completar tracklist"
                    onClick={() => setCompleteTarget(tl.id)}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </Button>
                )}
                {tl.status === TracklistStatus.COMPLETED && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-zinc-400 hover:text-zinc-300"
                    title="Archivar tracklist"
                    onClick={() => setArchiveTarget(tl.id)}
                  >
                    <Archive className="h-4 w-4" />
                  </Button>
                )}
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

      <AlertDialog open={completeTarget !== null} onOpenChange={(open) => { if (!open) setCompleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Completar tracklist?</AlertDialogTitle>
            <AlertDialogDescription>
              El tracklist pasará a estado Completado. Dejará de aparecer en el panel lateral. Podés volver a activarlo agregando un nuevo ticket.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleCompleteTracklist} disabled={isPending}>
              Completar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={archiveTarget !== null} onOpenChange={(open) => { if (!open) setArchiveTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Archivar tracklist?</AlertDialogTitle>
            <AlertDialogDescription>
              El tracklist pasará a estado Archivado. Podés volver a activarlo agregando un nuevo ticket.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchiveTracklist} disabled={isPending}>
              Archivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  )
}
