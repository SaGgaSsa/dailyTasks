import { TaskStatus } from '.prisma/client'

export type PlanningWarningCode =
  | 'MISSING_ESTIMATE'
  | 'MISSING_ASSIGNED_HOURS'
  | 'UNDER_ASSIGNED'
  | 'TODO_WITH_ACTIVITY'

const ACTIVE_STATUSES: TaskStatus[] = [
  TaskStatus.TODO,
  TaskStatus.IN_PROGRESS,
  TaskStatus.REVIEW,
]

interface PlanningAssignment {
  assignedHours: number | null
  tasks?: unknown[]
}

interface PlanningDiagnosticsInput {
  status: TaskStatus
  estimatedTime: number | null
  assignments: PlanningAssignment[]
  scriptsCount?: number
}

export function getTotalAssignedHours(assignments: PlanningAssignment[]) {
  return assignments.reduce((sum, assignment) => sum + (assignment.assignedHours ?? 0), 0)
}

export function getPlanningWarnings({
  status,
  estimatedTime,
  assignments,
  scriptsCount = 0,
}: PlanningDiagnosticsInput): PlanningWarningCode[] {
  if (!ACTIVE_STATUSES.includes(status)) {
    return []
  }

  const warnings: PlanningWarningCode[] = []
  const totalAssignedHours = getTotalAssignedHours(assignments)
  const hasValidEstimate = Boolean(estimatedTime && estimatedTime > 0)

  if (!hasValidEstimate) {
    warnings.push('MISSING_ESTIMATE')
  }

  if (assignments.some((assignment) => !assignment.assignedHours || assignment.assignedHours <= 0)) {
    warnings.push('MISSING_ASSIGNED_HOURS')
  }

  if (hasValidEstimate && totalAssignedHours < estimatedTime!) {
    warnings.push('UNDER_ASSIGNED')
  }

  const hasTaskActivity = assignments.some((assignment) => (assignment.tasks?.length ?? 0) > 0)
  if (status === TaskStatus.TODO && (hasTaskActivity || scriptsCount > 0)) {
    warnings.push('TODO_WITH_ACTIVITY')
  }

  return warnings
}
