import { getAllTracklistsWithTickets } from '@/app/actions/tracklists'
import { getCachedAssignableUsers } from '@/app/actions/user-actions'
import { AllTracklistsView } from './_components/all-tracklists-view'

export default async function TracklistsPage() {
  const [tracklistsResult, assignableUsers] = await Promise.all([
    getAllTracklistsWithTickets(),
    getCachedAssignableUsers(),
  ])

  const tracklists = tracklistsResult.success && tracklistsResult.data ? tracklistsResult.data : []

  return <AllTracklistsView tracklists={tracklists} assignableUsers={assignableUsers} />
}
