import { Incidence, User, SubTask, Assignment } from '@prisma/client'
import { TaskStatus, TaskType, TechStack, Priority } from './enums'

// Tipo para crear asignaciones con horas restantes
export interface AssigneeWithHours {
  userId: number
  remainingHours: number | null
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
