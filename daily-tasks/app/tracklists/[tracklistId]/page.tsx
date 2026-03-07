import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { getCachedAssignableUsers } from '@/app/actions/user-actions'
import { sortTicketsByPriorityAndNumber } from '@/lib/ticket-sort'
import { TracklistViewClient } from './_components/tracklist-view-client'

interface Props {
  params: Promise<{ tracklistId: string }>
}

export default async function TracklistDetailPage({ params }: Props) {
  const { tracklistId } = await params
  const numericId = Number(tracklistId)

  const [currentTracklist, tickets, allTracklists, assignableUsers] = await Promise.all([
    db.tracklist.findUnique({
      where: { id: numericId },
      select: { 
        id: true, 
        title: true, 
        description: true, 
        dueDate: true,
        incidences: { 
          select: { id: true, externalId: true, type: true, title: true }
        }
      }
    }),
    db.ticketQA.findMany({
      where: { tracklistId: numericId },
      include: {
        reportedBy: { select: { id: true, name: true, username: true } },
        assignedTo: { select: { id: true, name: true, username: true } },
        incidence: { select: { id: true, type: true, externalId: true } },
        dismissedBy: { select: { id: true, name: true, username: true } }
      }
    }).then(sortTicketsByPriorityAndNumber),
    db.tracklist.findMany({
      select: { id: true, title: true, createdAt: true },
      orderBy: { createdAt: 'desc' }
    }).then((tracklists) => {
      const current = tracklists.find(t => t.id === numericId)
      const others = tracklists.filter(t => t.id !== numericId)
      return current ? [current, ...others] : tracklists
    }),
    getCachedAssignableUsers()
  ])

  if (!currentTracklist) {
    redirect('/tracklists?invalid=1')
  }

  return (
    <div className="space-y-6">
      <TracklistViewClient
        tracklists={allTracklists}
        currentId={numericId}
        assignableUsers={assignableUsers}
        currentTracklist={currentTracklist}
        incidences={currentTracklist.incidences}
        initialTickets={tickets}
      />
    </div>
  )
}
