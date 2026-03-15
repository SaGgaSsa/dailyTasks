import { getAllTracklistsWithTickets, getGanttData } from '@/app/actions/tracklists'
import { getCachedAssignableUsers } from '@/app/actions/user-actions'
import { AllTracklistsView } from './_components/all-tracklists-view'

export default async function TracklistsPage() {
  const [tracklistsResult, ganttResult, assignableUsers] = await Promise.all([
    getAllTracklistsWithTickets(),
    getGanttData(),
    getCachedAssignableUsers(),
  ])

  const tracklists = tracklistsResult.success && tracklistsResult.data ? tracklistsResult.data : []
  const ganttData = ganttResult.success && ganttResult.data ? ganttResult.data : []

  return <AllTracklistsView tracklists={tracklists} ganttData={ganttData} assignableUsers={assignableUsers} />
}
