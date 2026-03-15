import { getAllTracklistsWithTickets, getGanttData } from '@/app/actions/tracklists'
import { getCachedAssignableUsers } from '@/app/actions/user-actions'
import { getCachedNonWorkingDays } from '@/app/actions/non-working-days'
import { AllTracklistsView } from './_components/all-tracklists-view'

export default async function TracklistsPage() {
  const [tracklistsResult, ganttResult, assignableUsers, nonWorkingDays] = await Promise.all([
    getAllTracklistsWithTickets(),
    getGanttData(),
    getCachedAssignableUsers(),
    getCachedNonWorkingDays(),
  ])

  const tracklists = tracklistsResult.success && tracklistsResult.data ? tracklistsResult.data : []
  const ganttData = ganttResult.success && ganttResult.data ? ganttResult.data : []

  return <AllTracklistsView tracklists={tracklists} ganttData={ganttData} assignableUsers={assignableUsers} nonWorkingDays={nonWorkingDays} />
}
