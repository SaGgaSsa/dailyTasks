import { redirect } from 'next/navigation'
import { getTracklists } from '@/app/actions/tracklists'
import { TracklistsEmptyState } from './_components/tracklists-empty-state'

export default async function TracklistsPage() {
  const result = await getTracklists()

  const tracklists = result.data
  if (!tracklists || tracklists.length === 0) {
    return <TracklistsEmptyState />
  }

  redirect(`/dashboard/tracklists/${tracklists[0].id}`)
}
