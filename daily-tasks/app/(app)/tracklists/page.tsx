import { getAllTracklistsWithTickets, getGanttData } from '@/app/actions/tracklists'
import { getCachedAssignableUsers } from '@/app/actions/user-actions'
import { getCachedNonWorkingDays } from '@/app/actions/non-working-days'
import { getCachedTechsWithModules } from '@/app/actions/tech'
import { AllTracklistsView } from './_components/all-tracklists-view'

export default async function TracklistsPage() {
  const [tracklistsResult, ganttResult, assignableUsers, nonWorkingDays, techsData] = await Promise.all([
    getAllTracklistsWithTickets(),
    getGanttData(),
    getCachedAssignableUsers(),
    getCachedNonWorkingDays(),
    getCachedTechsWithModules(),
  ])

  const tracklists = tracklistsResult.success && tracklistsResult.data ? tracklistsResult.data : []
  const ganttData = ganttResult.success && ganttResult.data ? ganttResult.data : []
  const techOptions = techsData.techs.map(t => ({ value: t.name, label: t.name }))

  return <AllTracklistsView tracklists={tracklists} ganttData={ganttData} assignableUsers={assignableUsers} nonWorkingDays={nonWorkingDays} techOptions={techOptions} />
}
