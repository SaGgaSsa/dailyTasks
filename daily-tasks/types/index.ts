import { Incidence, User, SubTask, Assignment } from '@prisma/client'
import { TaskStatus, TaskType, TechStack, Priority } from './enums'

export type { TaskStatus, TaskType, TechStack, Priority }

export type { SubTask }

export interface AssigneeWithHours {
  userId: number
  assignedHours: number | null
}

export type AssignmentWithDetails = Assignment & {
  user: User
  tasks: SubTask[]
}

export type IncidenceWithDetails = Omit<Incidence, 'status' | 'type' | 'technology' | 'priority' | 'position'> & {
  status: TaskStatus
  type: TaskType
  technology: TechStack
  priority: Priority
  position: number
  assignments: AssignmentWithDetails[]
}
