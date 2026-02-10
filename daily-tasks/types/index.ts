import { Incidence, User, SubTask, Assignment } from '@prisma/client'
import { TaskStatus, TaskType, TechStack, Priority } from './enums'

export { TaskStatus, TaskType, TechStack, Priority }

// Tipo para crear asignaciones con horas asignadas
export interface AssigneeWithHours {
  userId: number
  assignedHours: number | null
}

export type AssignmentWithDetails = Assignment & {
  user: User
  tasks: SubTask[]
}

export type IncidenceWithDetails = Omit<Incidence, 'status' | 'type' | 'technology' | 'priority'> & {
  status: TaskStatus
  type: TaskType
  technology: TechStack
  priority: Priority
  assignments: AssignmentWithDetails[]
}
