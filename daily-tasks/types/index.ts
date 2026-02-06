import { Incidence, User, SubTask } from '@prisma/client'

export type IncidenceWithDetails = Incidence & {
    assignees: User[]
    subTasks: SubTask[]
}
