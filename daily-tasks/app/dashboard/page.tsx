import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { getIncidences } from '@/app/actions/incidence-actions'
import { DashboardClient } from '@/components/board/dashboard-client'
import { TechStack } from '@/types/enums'

export default async function DashboardPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const session = await auth()
  const params = await searchParams

  // Protección de ruta - solo ADMIN puede acceder a /dashboard
  if (!session?.user) {
    redirect('/login')
  }

  if (session.user.role !== 'ADMIN') {
    redirect('/kanban')
  }

  const isAdmin = true

  // Parse search params para filtros múltiples y únicos
  const tech = params.tech 
    ? params.tech.includes(',') 
      ? params.tech.split(',').filter(Boolean) 
      : [params.tech].filter(Boolean)
    : Object.values(TechStack) // Por defecto, todas las tecnologías
  
  const status = params.status 
    ? params.status.includes(',')
      ? params.status.split(',').filter(Boolean)
      : [params.status].filter(Boolean)
    : ['BACKLOG'] // Por defecto, solo BACKLOG en el backlog
  
  const assignee = params.assignee 
    ? params.assignee.includes(',')
      ? params.assignee.split(',').filter(Boolean)
      : [params.assignee].filter(Boolean)
    : []
  
  const search = params.search || ''

  // Fetch data con filtros
  const backlogTasks = await getIncidences({
    viewType: 'BACKLOG',
    search,
    tech,
    status: status.length > 0 ? status.join(',') : status[0] || '',
    assignee
  })
  const kanbanTasks = await getIncidences({
    viewType: 'KANBAN',
    search,
    tech,
    assignee
  })

  return (
    <div className="flex flex-col h-screen bg-background">
      <div className="flex-1 p-2">
        <DashboardClient
          backlogTasks={backlogTasks}
          kanbanTasks={kanbanTasks}
          isAdmin={isAdmin}
        />
      </div>
    </div>
  )
}
