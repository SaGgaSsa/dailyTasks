import { IncidenceWithDetails } from '@/types'
import { TaskStatus } from '@/types/enums'

export function calculateCompletedHours(incidence: IncidenceWithDetails): number {
  return incidence.assignments
    .filter(a => a.isAssigned)
    .filter(a => {
      const hasTasks = a.tasks.length > 0
      if (!hasTasks) return false
      return a.tasks.every(t => t.isCompleted)
    })
    .reduce((acc, a) => acc + (a.estimatedHours || 0), 0)
}

export function formatHoursDisplay(completed: number, total: number | null): string {
  if (total === null || total === 0) return '-'
  return `${completed}/${total}h`
}

export function isFullyCompleted(completed: number, total: number | null): boolean {
  return total !== null && completed === total
}
