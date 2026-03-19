import { getAllTracklistsWithTickets, getGanttData } from '@/app/actions/tracklists'
import { getCachedTechsWithModules } from '@/app/actions/tech'
import { getCachedAssignableUsers } from '@/app/actions/user-actions'
import { getCachedNonWorkingDays } from '@/app/actions/non-working-days'
import { AllTracklistsView } from './_components/all-tracklists-view'

export default async function TracklistsPage() {
  const [tracklistsResult, ganttResult, assignableUsers, nonWorkingDays, techCatalog] = await Promise.all([
    getAllTracklistsWithTickets(),
    getGanttData(),
    getCachedAssignableUsers(),
    getCachedNonWorkingDays(),
    getCachedTechsWithModules(),
  ])

  const tracklists = tracklistsResult.success && tracklistsResult.data ? tracklistsResult.data : []
  const ganttData = ganttResult.success && ganttResult.data ? ganttResult.data : []
  const techOptions = techCatalog.techs.map((technology) => ({ value: technology.name, label: technology.name }))

  return <AllTracklistsView tracklists={tracklists} ganttData={ganttData} assignableUsers={assignableUsers} nonWorkingDays={nonWorkingDays} techOptions={techOptions} />
}
