import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { getIncidences } from '@/app/actions/incidence-actions'
import { DashboardClient } from '@/components/board/dashboard-client'
import { TechStack, TaskStatus } from '@/types/enums'

export default async function DashboardPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const session = await auth()
  const params = await searchParams

  // Protección de ruta - todos los usuarios pueden acceder a /dashboard
  if (!session?.user) {
    redirect('/login')
  }

  const isAdmin = session.user.role === 'ADMIN'

  // Parse search params para filtros múltiples y únicos
  const tech = params.tech 
    ? (Array.isArray(params.tech) ? params.tech : [params.tech])
        .flatMap(t => t.split(','))
        .filter(Boolean)
        .filter(t => Object.values(TechStack).includes(t as TechStack))
    : Object.values(TechStack)
  
  const status = params.status 
    ? (Array.isArray(params.status) ? params.status : [params.status])
        .flatMap(s => s.split(','))
        .filter(Boolean)
        .filter(s => Object.values(TaskStatus).includes(s as TaskStatus))
    : ['BACKLOG']
  
  const assignee = params.assignee 
    ? (Array.isArray(params.assignee) ? params.assignee : [params.assignee])
        .flatMap(a => a.split(','))
        .filter(Boolean)
    : []
  
  const mine = params.mine === 'true'
  
  const search = params.search || ''

  // Fetch data con filtros
  const backlogTasks = await getIncidences({
    viewType: 'BACKLOG',
    search,
    tech,
    status: status.length > 0 ? status.join(',') : '',
    assignee,
    mine
  })
  const kanbanTasks = await getIncidences({
    viewType: 'KANBAN',
    search,
    tech,
    assignee,
    mine
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
