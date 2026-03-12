import { Incidence, User, Task, Assignment, Attachment, IncidencePage, Tracklist, TicketQA, Technology, Module as ModulePrisma, ExternalWorkItem } from '@prisma/client'
import { TaskStatus, TaskType, Priority, AttachmentType, TicketType, TicketQAStatus } from './enums'
import { z } from 'zod'

export type { TaskStatus, TaskType, Priority, AttachmentType, TicketType, TicketQAStatus }
export type { Technology }
export type { Task, Attachment, IncidencePage, ExternalWorkItem }

export type ModuleWithTech = ModulePrisma & { technology: Technology }

export interface AssigneeWithHours {
  userId: number
  assignedHours: number | null
}

export type AssignmentWithDetails = Assignment & {
  user: User
  tasks: Task[]
}

export type AttachmentWithDetails = Attachment & {
  uploadedBy: User
}

export type ExternalWorkItemWithAttachments = ExternalWorkItem & {
  attachments: AttachmentWithDetails[]
}

export type IncidencePageWithAuthor = IncidencePage & {
  author: User
}

export type IncidenceWithDetails = Omit<Incidence, 'status' | 'technology' | 'priority' | 'position'> & {
  status: TaskStatus
  technology: Technology
  priority: Priority
  position: number
  externalWorkItem: ExternalWorkItemWithAttachments
  assignments: AssignmentWithDetails[]
  pages: IncidencePageWithAuthor[]
  qaTickets: { id: number }[]
}

export type TracklistWithDetails = Tracklist & {
  _count: { tickets: number }
  createdBy: Pick<User, 'id' | 'name' | 'username'>
}

export type TicketQAWithDetails = TicketQA & {
  reportedBy: Pick<User, 'id' | 'name' | 'username'>
  assignedTo: Pick<User, 'id' | 'name' | 'username'> | null
  externalWorkItem: Pick<ExternalWorkItem, 'id' | 'type' | 'externalId'> | null
  dismissedBy: Pick<User, 'id' | 'name' | 'username'> | null
  module: Pick<ModulePrisma, 'id' | 'name' | 'slug'> & { technology: { name: string } }
  hasUnreadUpdates: boolean
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

const ticketSchemaBase = z.object({
  type: z.nativeEnum(TicketType),
  moduleId: z.number().int().positive(),
  description: z.string().min(1, 'Descripción requerida').max(500, 'Máximo 500 caracteres'),
  priority: z.nativeEnum(Priority),
  externalWorkItemId: z.number().optional(),
  observations: z.string().max(1000, 'Máximo 1000 caracteres').optional(),
  assignedToId: z.number().optional(),
})

export const createTicketSchema = ticketSchemaBase

export const updateTicketSchema = ticketSchemaBase.partial()

export type CreateTicketInput = z.infer<typeof createTicketSchema>
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>
