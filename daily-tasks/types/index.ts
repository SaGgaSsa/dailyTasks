import { Incidence, User, SubTask } from '@prisma/client'
import { TaskStatus, TaskType, TechStack, Priority } from './enums'

export type IncidenceWithDetails = Omit<Incidence, 'status' | 'type' | 'technology' | 'priority'> & {
    status: TaskStatus
    type: TaskType
    technology: TechStack
    priority: Priority
    assignees: User[]
    subTasks: SubTask[]
}
