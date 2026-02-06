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

  // Fetch both if admin, or just execution if dev
  const planningTasks = isAdmin ? await getIncidences('PLANNING') : []
  const executionTasks = await getIncidences('EXECUTION')

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex-1 p-6 h-full overflow-hidden">
        <DashboardClient
          planningTasks={planningTasks}
          executionTasks={executionTasks}
          isAdmin={isAdmin}
        />
      </div>
    </div>
  )
}
