import { Incidence, User, SubTask, Assignment, Attachment, IncidencePage, Tracklist, TicketQA, Technology, Module as ModulePrisma } from '@prisma/client'
import { TaskStatus, TaskType, Priority, AttachmentType, TicketType, TicketQAStatus } from './enums'
import { z } from 'zod'

export type { TaskStatus, TaskType, Priority, AttachmentType, TicketType, TicketQAStatus }
export type { Technology }
export type { SubTask, Attachment, IncidencePage }

export type ModuleWithTech = ModulePrisma & { technology: Technology }

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
  dismissedBy: Pick<User, 'id' | 'name' | 'username'> | null
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

const MODULE_NAMES = ['Serv', 'Comun', 'WkFlow', 'OBase', 'MyTasksApp', 'MobileLibrary', 'FormLibrary', 'MyTasks', 'Mobile', 'MyTasksServer', 'MobileServer'] as const

const ticketSchemaBase = z.object({
  type: z.nativeEnum(TicketType),
  module: z.enum(MODULE_NAMES),
  description: z.string().min(1, 'Descripción requerida').max(500, 'Máximo 500 caracteres'),
  priority: z.nativeEnum(Priority),
  tramite: z.string().max(50, 'Máximo 50 caracteres').optional(),
  observations: z.string().max(1000, 'Máximo 1000 caracteres').optional(),
  assignedToId: z.number().optional(),
  incidenceId: z.number().optional(),
})

export const createTicketSchema = ticketSchemaBase

export const updateTicketSchema = ticketSchemaBase.partial()

export type CreateTicketInput = z.infer<typeof createTicketSchema>
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>
