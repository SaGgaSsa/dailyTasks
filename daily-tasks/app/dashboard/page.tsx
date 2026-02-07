import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { getIncidences } from '@/app/actions/incidence-actions'
import { DashboardClient } from '@/components/board/dashboard-client'

export default async function DashboardPage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  const isAdmin = session.user.role === 'ADMIN'

  // Fetch both if admin, or just kanban if dev
  const backlogTasks = isAdmin ? await getIncidences('BACKLOG') : []
  const kanbanTasks = await getIncidences('KANBAN')

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex-1 p-2 h-full overflow-hidden">
        <DashboardClient
          backlogTasks={backlogTasks}
          kanbanTasks={kanbanTasks}
          isAdmin={isAdmin}
        />
      </div>
    </div>
  )
}
