import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { getCachedTechsWithModules } from '@/app/actions/tech'
import { getCachedAssignableUsers } from '@/app/actions/user-actions'
import { sortTicketsByPriorityAndNumber } from '@/lib/ticket-sort'
import { TracklistViewClient } from './_components/tracklist-view-client'
import { addTicketDeploymentSummaries, enrichTicketScripts, ticketDetailsInclude } from '@/lib/tracklist-ticket-management'

interface Props {
  params: Promise<{ tracklistId: string }>
  searchParams: Promise<{ ticketId?: string; ticketMode?: string }>
}

export default async function TracklistDetailPage({ params, searchParams }: Props) {
  const { tracklistId } = await params
  const { ticketId, ticketMode } = await searchParams
  const numericId = Number(tracklistId)
  const initialOpenTicketId = Number(ticketId)
  const hasValidInitialTicketId = Number.isInteger(initialOpenTicketId) && initialOpenTicketId > 0

  const [currentTracklist, tickets, assignableUsers, techsData] = await Promise.all([
    db.tracklist.findUnique({
      where: { id: numericId },
      select: { id: true, title: true, status: true }
    }),
    db.ticketQA.findMany({
      where: { tracklistId: numericId },
      include: ticketDetailsInclude,
    }).then(async (tickets) => sortTicketsByPriorityAndNumber(await addTicketDeploymentSummaries(tickets.map(enrichTicketScripts)))),
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
        initialOpenTicketId={hasValidInitialTicketId ? initialOpenTicketId : null}
        initialTicketMode={ticketMode === 'view' ? 'view' : null}
      />
    </div>
  )
}
