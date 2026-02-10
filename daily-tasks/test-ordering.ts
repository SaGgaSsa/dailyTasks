import { getIncidences } from './app/actions/incidence-actions'
import { TechStack } from './types/enums'

async function testGetIncidences() {
  try {
    const backlogTasks = await getIncidences({
      viewType: 'BACKLOG',
      search: '',
      tech: Object.values(TechStack),
      status: 'BACKLOG',
      assignee: []
    })
    
    // Test kanban too
    const kanbanTasks = await getIncidences({
      viewType: 'KANBAN',
      search: '',
      tech: Object.values(TechStack),
      assignee: []
    })
    
  } catch (error) {
    console.error('Error testing getIncidences:', error)
  }
}

testGetIncidences()