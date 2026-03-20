import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { getCachedAssignableUsers } from '@/app/actions/user-actions'
import { getCachedTechsWithModules } from '@/app/actions/tech'
import { sortTicketsByPriorityAndNumber } from '@/lib/ticket-sort'
import { TracklistViewClient } from './_components/tracklist-view-client'
import { externalWorkItemBaseSelect, serializeExternalWorkItem } from '@/lib/work-item-types'

interface Props {
  params: Promise<{ tracklistId: string }>
}

export default async function TracklistDetailPage({ params }: Props) {
  const { tracklistId } = await params
  const numericId = Number(tracklistId)

  const [currentTracklist, tickets, assignableUsers, techsData] = await Promise.all([
    db.tracklist.findUnique({
      where: { id: numericId },
      select: { id: true, title: true, status: true }
    }),
    db.ticketQA.findMany({
      where: { tracklistId: numericId },
      include: {
        reportedBy: { select: { id: true, name: true, username: true } },
        assignedTo: { select: { id: true, name: true, username: true } },
        externalWorkItem: { select: externalWorkItemBaseSelect },
        dismissedBy: { select: { id: true, name: true, username: true } },
        module: { select: { id: true, name: true, slug: true, technology: { select: { name: true } } } },
        incidence: {
          select: {
            id: true,
            status: true,
            startedAt: true,
            completedAt: true,
            estimatedTime: true,
            assignments: {
              where: { isAssigned: true },
              select: { assignedHours: true }
            },
            _count: {
              select: { scripts: true },
            },
          },
        },
      }
    }).then((tickets) => sortTicketsByPriorityAndNumber(tickets.map((ticket) => {
      const inc = ticket.incidence

      return {
        ...ticket,
        externalWorkItem: ticket.externalWorkItem ? serializeExternalWorkItem(ticket.externalWorkItem) : null,
        hasScripts: (inc?._count?.scripts ?? 0) > 0,
        incidenceGantt: inc ? {
          id: inc.id,
          status: inc.status as import('@/types/enums').TaskStatus,
          startedAt: inc.startedAt,
          completedAt: inc.completedAt,
          estimatedTime: inc.estimatedTime,
          totalAssignedHours: inc.assignments.reduce((sum: number, a: { assignedHours: number | null }) => sum + (a.assignedHours ?? 0), 0),
        } : null,
      }
    }))),
    getCachedAssignableUsers(),
    getCachedTechsWithModules(),
  ])

  if (!currentTracklist) {
    redirect('/tracklists')
  }

  const techOptions = techsData.techs.map(t => ({ value: t.name, label: t.name }))

  return (
    <div className="space-y-6">
      <TracklistViewClient
        currentId={numericId}
        title={currentTracklist.title}
        status={currentTracklist.status}
        assignableUsers={assignableUsers}
        initialTickets={tickets}
        techOptions={techOptions}
      />
    </div>
  )
}
