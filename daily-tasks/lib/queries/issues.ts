import { IncidenceWithDetails } from '@/types'

interface GetIssuesOptions {
  viewType: 'BACKLOG' | 'KANBAN'
  search?: string
  tech?: string[]
  status?: string[]
  assignee?: string[]
}

export async function getIssuesFromServer({ 
  viewType, 
  search, 
  tech, 
  status, 
  assignee 
}: GetIssuesOptions): Promise<IncidenceWithDetails[]> {
  // This function should be called from a server action or API route
  // It parses searchParams from URL and applies filters
  
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const params = new URLSearchParams()
  
  if (search) params.set('search', search)
  if (tech && tech.length > 0) {
    tech.forEach(t => params.append('tech', t))
  }
  if (status && status.length > 0) {
    status.forEach(s => params.append('status', s))
  }
  if (assignee && assignee.length > 0) {
    assignee.forEach(a => params.append('assignee', a))
  }
  
  params.set('viewType', viewType)
  
  const response = await fetch(`${baseUrl}/api/issues?${params.toString()}`)
  
  if (!response.ok) {
    throw new Error('Failed to fetch issues')
  }
  
  return response.json()
}

export function parseIssuesSearchParams(searchParams: URLSearchParams): GetIssuesOptions {
  return {
    viewType: (searchParams.get('viewType') as 'BACKLOG' | 'KANBAN') || 'BACKLOG',
    search: searchParams.get('search') || '',
    tech: searchParams.getAll('tech').filter(Boolean),
    status: searchParams.getAll('status').filter(Boolean),
    assignee: searchParams.getAll('assignee').filter(Boolean)
  }
}