import { getIncidences } from './app/actions/incidence-actions'
import { TechStack } from './types/enums'

async function testGetIncidences() {
  try {
    const backlogResult = await getIncidences({
      viewType: 'BACKLOG',
      search: '',
      tech: Object.values(TechStack),
      status: 'BACKLOG',
      assignee: []
    })
    const backlogTasks = backlogResult.data
    if (backlogResult.error) {
      console.error(backlogResult.error)
    }
    
    // Test kanban too
    const kanbanResult = await getIncidences({
      viewType: 'KANBAN',
      search: '',
      tech: Object.values(TechStack),
      assignee: []
    })
    const kanbanTasks = kanbanResult.data
    if (kanbanResult.error) {
      console.error(kanbanResult.error)
    }
    
  } catch (error) {
    console.error('Error testing getIncidences:', error)
  }
}

testGetIncidences()