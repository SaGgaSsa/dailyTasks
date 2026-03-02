import { getTracklists } from '@/app/actions/tracklists'
import { TracklistSelector } from './_components/tracklist-selector'
import { TicketsGrid } from './_components/tickets-grid'

interface Props {
  params: Promise<{ tracklistId: string }>
}

export default async function TracklistDetailPage({ params }: Props) {
  const { tracklistId } = await params
  const result = await getTracklists()
  
  const tracklists = result.data || []
  const currentTracklist = tracklists.find(t => t.id === Number(tracklistId))

  if (!currentTracklist) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <h2 className="text-2xl font-semibold">Tracklist no encontrado</h2>
        <p className="text-muted-foreground">
          El tracklist que buscas no existe
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <TracklistSelector 
        tracklists={tracklists} 
        currentId={Number(tracklistId)} 
      />
      <TicketsGrid tracklistId={tracklistId} />
    </div>
  )
}
