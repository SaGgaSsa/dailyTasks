import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { getIncidences } from '@/app/actions/incidence-actions'
import { DashboardClient } from '@/components/board/dashboard-client'
import { TechStack, TaskStatus } from '@/types/enums'
import { IncidenceWithDetails } from '@/types'

export default async function DashboardPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const session = await auth()
  const params = await searchParams

  if (!session?.user) {
    redirect('/login')
  }

  const isAdmin = session.user.role === 'ADMIN'

  const viewParam = params.view

  const currentView = viewParam === 'kanban' ? 'KANBAN' : 'BACKLOG'

  if (!isAdmin && currentView === 'BACKLOG') {
    const otherParams = new URLSearchParams()
    
    Object.entries(params).forEach(([key, value]) => {
      if (key !== 'view' && value) {
        otherParams.set(key, value)
      }
    })
    
    const queryString = otherParams.toString()
    const redirectUrl = queryString 
      ? `/dashboard?view=kanban&${queryString}`
      : '/dashboard?view=kanban'
    
    redirect(redirectUrl)
  }

  const tech = params.tech 
    ? (Array.isArray(params.tech) ? params.tech : [params.tech])
        .flatMap(t => t.split(','))
        .filter(Boolean)
        .filter(t => Object.values(TechStack).includes(t as TechStack))
    : Object.values(TechStack)
  
  const statusParam = currentView === 'KANBAN' 
    ? [] 
    : params.status 
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

  let backlogTasks: IncidenceWithDetails[] = []
  let kanbanTasks: IncidenceWithDetails[] = []

  if (currentView === 'BACKLOG') {
    const backlogResult = await getIncidences({
      viewType: 'BACKLOG',
      search,
      tech,
      status: statusParam.join(','),
      assignee,
      mine
    })
    backlogTasks = backlogResult.data
    if (backlogResult.error) {
      console.error(backlogResult.error)
    }
  } else {
    const kanbanResult = await getIncidences({
      viewType: 'KANBAN',
      search,
      tech,
      assignee,
      mine
    })
    kanbanTasks = kanbanResult.data
    if (kanbanResult.error) {
      console.error(kanbanResult.error)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <div className="flex-1 p-2">
        <DashboardClient
          view={currentView}
          backlogTasks={backlogTasks}
          kanbanTasks={kanbanTasks}
          isAdmin={isAdmin}
        />
      </div>
    </div>
  )
}
