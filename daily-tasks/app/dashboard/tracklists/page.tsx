import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { TracklistsEmptyState } from './_components/tracklists-empty-state'

export default async function TracklistsPage() {
  const tracklist = await db.tracklist.findFirst({
    orderBy: { createdAt: 'desc' },
  })

  if (!tracklist) {
    return <TracklistsEmptyState />
  }

  redirect(`/dashboard/tracklists/${tracklist.id}`)
}
