import { Incidence, User, Task, Assignment, Attachment, IncidencePage, Tracklist, TicketQA, Technology, Module as ModulePrisma, ExternalWorkItem, IncidencePageType } from '@prisma/client'
import { TaskStatus, TaskType, Priority, AttachmentType, TicketType, TicketQAStatus } from './enums'
import { z } from 'zod'

export type { TaskStatus, TaskType, Priority, AttachmentType, TicketType, TicketQAStatus }
export type { Technology }
export type { Task, Attachment, IncidencePage, ExternalWorkItem, IncidencePageType }

export type ModuleWithTech = ModulePrisma & { technology: Technology }

export interface AssigneeWithHours {
  userId: number
  assignedHours: number | null
}

export interface IncidenceTaskCreateInput {
  userId: number
  title: string
  isCompleted: boolean
}

export interface IncidenceTaskUpdateInput {
  taskId: number
  title: string
  isCompleted: boolean
}

export interface SaveIncidenceTaskChangesInput {
  incidenceId: number
  assignees?: AssigneeWithHours[]
  createdTasks?: IncidenceTaskCreateInput[]
  updatedTasks?: IncidenceTaskUpdateInput[]
  deletedTaskIds?: number[]
  incidencePatch?: {
    description?: string
    comment?: string
    priority?: Priority
    estimatedTime?: number | null
    technology?: string
  }
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

export interface GanttIncidence {
  id: number
  description: string
  status: TaskStatus
  priority: string
  startedAt: Date | null
  completedAt: Date | null
  estimatedTime: number | null
  createdAt: Date
  externalWorkItem: { id: number; type: string; externalId: number }
  technology: { name: string }
  assignments: {
    user: Pick<User, 'id' | 'name' | 'username'>
    tasks: { id: number; isCompleted: boolean }[]
  }[]
  ticket: { id: number; ticketNumber: number; createdAt: Date } | null
}

export interface GanttTracklist {
  id: number
  title: string
  description: string | null
  dueDate: Date | null
  status: string
  incidences: GanttIncidence[]
}

export interface IncidenceGanttData {
  id: number
  status: TaskStatus
  startedAt: Date | null
  completedAt: Date | null
  estimatedTime: number | null
  totalAssignedHours: number
}

export type TicketQAWithDetails = TicketQA & {
  reportedBy: Pick<User, 'id' | 'name' | 'username'>
  assignedTo: Pick<User, 'id' | 'name' | 'username'> | null
  externalWorkItem: Pick<ExternalWorkItem, 'id' | 'type' | 'externalId'> | null
  dismissedBy: Pick<User, 'id' | 'name' | 'username'> | null
  module: Pick<ModulePrisma, 'id' | 'name' | 'slug'> & { technology: { name: string } }
  hasUnreadUpdates: boolean
  scriptPageId: number | null
  hasScriptsContent: boolean
  incidenceGantt: IncidenceGanttData | null
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
  observations: z.string().optional(),
  assignedToId: z.number().optional(),
})

export const createTicketSchema = ticketSchemaBase

export const updateTicketSchema = ticketSchemaBase.partial()

export type CreateTicketInput = z.infer<typeof createTicketSchema>
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>
