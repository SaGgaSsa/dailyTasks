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

  const [currentTracklist, tickets, assignableUsers] = await Promise.all([
    db.tracklist.findUnique({
      where: { id: numericId },
      select: { id: true, title: true, status: true }
    }),
    db.ticketQA.findMany({
      where: { tracklistId: numericId },
      include: {
        reportedBy: { select: { id: true, name: true, username: true } },
        assignedTo: { select: { id: true, name: true, username: true } },
        externalWorkItem: { select: { id: true, type: true, externalId: true } },
        dismissedBy: { select: { id: true, name: true, username: true } },
        module: { select: { id: true, name: true, slug: true, technology: { select: { name: true } } } },
      }
    }).then(sortTicketsByPriorityAndNumber),
    getCachedAssignableUsers()
  ])

  if (!currentTracklist) {
    redirect('/tracklists')
  }

  return (
    <div className="space-y-6">
      <TracklistViewClient
        currentId={numericId}
        title={currentTracklist.title}
        status={currentTracklist.status}
        assignableUsers={assignableUsers}
        initialTickets={tickets}
      />
    </div>
  )
}
