'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, ListTodo, LayoutDashboard, ExternalLink, ClipboardList } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CreateTracklistDialog } from '@/components/tracklists/create-tracklist-dialog'
import { CreateTicketDialog } from '@/components/tracklists/create-ticket-dialog'
import { AllTracklistsTicketsTable } from './all-tracklists-tickets-table'
import { AssignableUser } from '@/app/actions/user-actions'
import { TicketQAWithDetails } from '@/types'

// The shape returned by getAllTracklistsWithTickets
interface TracklistWithTickets {
  id: number
  title: string
  description: string | null
  dueDate: Date | null
  tickets: TicketQAWithDetails[]
}

interface Props {
  tracklists: TracklistWithTickets[]
  assignableUsers: AssignableUser[]
}

export function AllTracklistsView({ tracklists, assignableUsers }: Props) {
  const [createTracklistOpen, setCreateTracklistOpen] = useState(false)
  const [addTicketTracklistId, setAddTicketTracklistId] = useState<number | null>(null)

  return (
    <div className="flex flex-col gap-6 p-4 h-full overflow-auto">
      {/* Toolbar */}
      <div className="flex justify-end items-center gap-2">
        <Button
          className="bg-primary hover:bg-primary/90 text-primary-foreground h-8 w-8 p-0"
          onClick={() => setCreateTracklistOpen(true)}
        >
          <Plus className="h-4 w-4" />
        </Button>
        <Tabs value="list">
          <TabsList className="bg-muted border border-border h-8">
            <TabsTrigger value="list" className="data-[state=active]:bg-accent px-3">
              <ListTodo className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger value="kanban" className="data-[state=active]:bg-accent px-3">
              <LayoutDashboard className="h-4 w-4" />
            </TabsTrigger>
          </TabsList>
        </Tabs>
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
              <div className="flex flex-col gap-0.5">
                <h2 className="text-base font-semibold">{tl.title}</h2>
                {tl.description && (
                  <p className="text-sm text-muted-foreground">{tl.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Link href={`/tracklists/${tl.id}`}>
                  <Button variant="ghost" size="icon" className="h-8 w-8" title="Ver tracklist">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </Link>
                <Button
                  className="bg-primary hover:bg-primary/90 text-primary-foreground h-8 w-8 p-0"
                  onClick={() => setAddTicketTracklistId(tl.id)}
                  title="Agregar ticket"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Tickets table */}
            <AllTracklistsTicketsTable tickets={tl.tickets} assignableUsers={assignableUsers} />
          </div>
        ))
      )}

      {/* Dialogs */}
      <CreateTracklistDialog
        open={createTracklistOpen}
        onOpenChange={setCreateTracklistOpen}
      />

      {addTicketTracklistId !== null && (
        <CreateTicketDialog
          tracklistId={addTicketTracklistId}
          assignableUsers={assignableUsers}
          open={true}
          onOpenChange={(open) => { if (!open) setAddTicketTracklistId(null) }}
        />
      )}
    </div>
  )
}
