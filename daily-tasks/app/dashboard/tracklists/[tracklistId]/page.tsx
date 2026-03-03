import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { TracklistSelector } from './_components/tracklist-selector'
import { TicketsGrid } from './_components/tickets-grid'

interface Props {
  params: Promise<{ tracklistId: string }>
}

export default async function TracklistDetailPage({ params }: Props) {
  const { tracklistId } = await params
  const numericId = Number(tracklistId)

  const [currentTracklist, allTracklists] = await Promise.all([
    db.tracklist.findUnique({
      where: { id: numericId },
      include: { 
        tickets: {
          include: {
            reportedBy: { select: { id: true, name: true, username: true } },
            assignedTo: { select: { id: true, name: true, username: true } }
          }
        }
      }
    }),
    db.tracklist.findMany({
      select: { id: true, title: true, createdAt: true },
      orderBy: { createdAt: 'desc' }
    }).then((tracklists) => {
      const current = tracklists.find(t => t.id === numericId)
      const others = tracklists.filter(t => t.id !== numericId)
      return current ? [current, ...others] : tracklists
    })
  ])

  if (!currentTracklist) {
    redirect('/dashboard/tracklists?invalid=1')
  }

  return (
    <div className="space-y-6">
      <TracklistSelector 
        tracklists={allTracklists} 
        currentId={numericId} 
      />
      <TicketsGrid tracklistId={tracklistId} initialTickets={currentTracklist.tickets} />
    </div>
  )
}
