'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { ListTodo, LayoutDashboard, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TracklistToolbar, TICKET_STATUS_OPTIONS, type ViewOption } from '@/app/(app)/tracklists/_components/tracklist-toolbar'
import { FilterChips } from '@/components/ui/filter-chips'
import { CreateTicketDialog } from '@/components/tracklists/create-ticket-dialog'
import { TicketsGrid } from './tickets-grid'
import { TicketQAWithDetails } from '@/types'
import { AssignableUser } from '@/app/actions/user-actions'
import { useNavbarBreadcrumbs } from '@/components/providers/navbar-breadcrumb-provider'
import { getTicketById } from '@/app/actions/tracklists'
import { toast } from 'sonner'

interface Props {
  currentId: number
  title: string
  status: string
  assignableUsers: AssignableUser[]
  initialTickets: TicketQAWithDetails[]
  techOptions: { value: string; label: string }[]
  initialOpenTicketId: number | null
  initialTicketMode: 'view' | null
}

export function TracklistViewClient({
  currentId,
  title,
  status,
  assignableUsers,
  initialTickets,
  techOptions,
  initialOpenTicketId,
  initialTicketMode,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const { setBreadcrumbs } = useNavbarBreadcrumbs()
  const [, startTransition] = useTransition()

  useEffect(() => {
    setBreadcrumbs([
      { label: 'Tracklists', href: '/tracklists' },
      { label: title },
    ])
    return () => setBreadcrumbs([])
  }, [title, setBreadcrumbs])

  const viewOptions: ViewOption[] = [
    { value: 'list', icon: <ListTodo className="h-4 w-4" /> },
    { value: 'kanban', icon: <LayoutDashboard className="h-4 w-4" /> },
  ]

  const [view, setView] = useState<'list' | 'kanban'>('list')
  const [selectedStatus, setSelectedStatus] = useState<string[]>([])
  const [selectedUser, setSelectedUser] = useState<string[]>([])
  const [selectedTech, setSelectedTech] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [isTicketDialogOpen, setIsTicketDialogOpen] = useState(false)
  const [linkedTicket, setLinkedTicket] = useState<TicketQAWithDetails | null>(null)
  const hasHandledInitialOpen = useRef(false)

  useEffect(() => {
    if (hasHandledInitialOpen.current || initialTicketMode !== 'view' || !initialOpenTicketId) {
      return
    }

    hasHandledInitialOpen.current = true
    startTransition(async () => {
      const result = await getTicketById(initialOpenTicketId)
      if (!result.success || !result.data) {
        toast.error(result.error || 'No se pudo abrir el ticket')
        router.replace(pathname, { scroll: false })
        return
      }

      if (result.data.tracklistId !== currentId) {
        toast.error('El ticket no pertenece a este tracklist')
        router.replace(pathname, { scroll: false })
        return
      }

      setLinkedTicket(result.data)
    })
  }, [currentId, initialOpenTicketId, initialTicketMode, pathname, router, startTransition])

  const handleLinkedTicketOpenChange = (open: boolean) => {
    if (open) {
      return
    }

    setLinkedTicket(null)
    router.replace(pathname, { scroll: false })
  }

  return (
    <>
      <div className="flex flex-col gap-2 px-1">
        <TracklistToolbar
          search={search}
          onSearchChange={setSearch}
          selectedStatus={selectedStatus}
          onStatusChange={setSelectedStatus}
          selectedUser={selectedUser}
          onUserChange={setSelectedUser}
          selectedTech={selectedTech}
          onTechChange={setSelectedTech}
          techOptions={techOptions}
          assignableUsers={assignableUsers}
          view={view}
          onViewChange={(v) => setView(v as 'list' | 'kanban')}
          viewOptions={viewOptions}
          trailing={
            <Button
              className="bg-primary hover:bg-primary/90 text-primary-foreground h-8 w-8 p-0"
              onClick={() => setIsTicketDialogOpen(true)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          }
        />
        <FilterChips
          searchQuery={search}
          selectedStatus={selectedStatus}
          selectedAssignee={selectedUser}
          selectedTech={selectedTech}
          statusOptions={TICKET_STATUS_OPTIONS}
          assigneeOptions={assignableUsers.map(u => ({ value: String(u.id), label: u.name || u.username }))}
          techOptions={techOptions}
          onSearchChange={setSearch}
          onStatusChange={setSelectedStatus}
          onAssigneeChange={setSelectedUser}
          onTechChange={setSelectedTech}
          onResetFilters={() => { setSearch(''); setSelectedStatus([]); setSelectedUser([]); setSelectedTech([]) }}
        />
      </div>
      <TicketsGrid
        initialTickets={initialTickets}
        assignableUsers={assignableUsers}
        view={view}
        selectedStatus={selectedStatus}
        selectedUser={selectedUser}
        selectedTech={selectedTech}
        search={search}
        readOnly={status !== 'ACTIVE'}
      />
      <CreateTicketDialog
        tracklistId={currentId}
        assignableUsers={assignableUsers}
        open={isTicketDialogOpen}
        onOpenChange={setIsTicketDialogOpen}
      />
      {linkedTicket && (
        <CreateTicketDialog
          tracklistId={currentId}
          assignableUsers={assignableUsers}
          open={!!linkedTicket}
          onOpenChange={handleLinkedTicketOpenChange}
          viewMode={linkedTicket}
        />
      )}
    </>
  )
}
