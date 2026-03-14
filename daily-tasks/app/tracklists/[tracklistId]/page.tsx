import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { getCachedAssignableUsers } from '@/app/actions/user-actions'
import { sortTicketsByPriorityAndNumber } from '@/lib/ticket-sort'
import { TracklistViewClient } from './_components/tracklist-view-client'
import { IncidencePageType } from '@prisma/client'
import { pageHasMeaningfulContent } from '@/lib/incidence-pages'

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
        incidence: {
          select: {
            pages: {
              where: { pageType: IncidencePageType.SYSTEM_SCRIPTS },
              select: { id: true, content: true },
              take: 1,
            },
          },
        },
      }
    }).then((tickets) => sortTicketsByPriorityAndNumber(tickets.map((ticket) => {
      const scriptPage = ticket.incidence?.pages[0] ?? null

      return {
        ...ticket,
        scriptPageId: scriptPage?.id ?? null,
        hasScriptsContent: pageHasMeaningfulContent(scriptPage?.content ?? null),
      }
    }))),
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
