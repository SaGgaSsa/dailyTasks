import { Incidence, User, SubTask, Assignment, Attachment, IncidencePage, Tracklist, TicketQA, Technology } from '@prisma/client'
import { TaskStatus, TaskType, Priority, AttachmentType } from './enums'
import { z } from 'zod'

export type { TaskStatus, TaskType, Priority, AttachmentType }
export type { Technology }

export type { SubTask, Attachment, IncidencePage }

export interface AssigneeWithHours {
  userId: number
  assignedHours: number | null
}

export type AssignmentWithDetails = Assignment & {
  user: User
  tasks: SubTask[]
}

export type AttachmentWithDetails = Attachment & {
  uploadedBy: User
}

export type IncidencePageWithAuthor = IncidencePage & {
  author: User
}

export type IncidenceWithDetails = Omit<Incidence, 'status' | 'type' | 'technology' | 'priority' | 'position'> & {
  status: TaskStatus
  type: TaskType
  technology: Technology
  priority: Priority
  position: number
  assignments: AssignmentWithDetails[]
  attachments: AttachmentWithDetails[]
  pages: IncidencePageWithAuthor[]
}

export type TracklistWithDetails = Tracklist & {
  _count: { tickets: number }
  createdBy: Pick<User, 'id' | 'name' | 'username'>
}

export type TicketQAWithDetails = TicketQA & {
  reportedBy: Pick<User, 'id' | 'name' | 'username'>
  assignedTo: Pick<User, 'id' | 'name' | 'username'> | null
  incidence: Pick<Incidence, 'id' | 'type' | 'externalId'> | null
}

export const createUserSchema = z.object({
  username: z.string()
    .min(3, 'Mínimo 3 caracteres')
    .max(30, 'Máximo 30 caracteres')
    .regex(/^[a-zA-Z0-9_]+$/, 'Solo letras, números y guiones bajos'),
  name: z.string()
    .max(100, 'Máximo 100 caracteres')
    .optional(),
  email: z.string()
    .email('Email inválido'),
  password: z.string()
    .min(4, 'Mínimo 4 caracteres'),
  role: z.enum(['ADMIN', 'DEV', 'QA']),
  technologies: z.array(z.string()).optional(),
})

export const updateUserSchema = createUserSchema.omit({ password: true })

export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
