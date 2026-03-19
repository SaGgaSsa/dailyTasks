import type { Incidence, User, Task, Assignment, Attachment, IncidencePage, Tracklist, TicketQA, Technology, Module as ModulePrisma, WorkItemType, ExternalWorkItemStatus, ScriptType } from '.prisma/client'
import { TaskStatus, TaskType, Priority, AttachmentType, TicketType, TicketQAStatus } from './enums'
import { z } from 'zod'
import { normalizeUsername } from '@/lib/usernames'

export type { TaskStatus, TaskType, Priority, AttachmentType, TicketType, TicketQAStatus }
export type { Technology, WorkItemType, ExternalWorkItemStatus }
export type { Task, Attachment, IncidencePage }

export type ScriptWithCreator = {
    id: number
    content: string
    type: ScriptType
    incidenceId: number
    createdById: number
    createdAt: Date
    updatedAt: Date
    createdBy: { id: number; name: string | null; username: string }
}

export type ModuleWithTech = ModulePrisma & { technology: Technology }

export interface AssigneeWithHours {
  userId: number
  assignedHours: number | null
}

export interface IncidenceTaskCreateInput {
  userId: number
  title: string
  isCompleted: boolean
  isPinned?: boolean
}

export interface IncidenceTaskUpdateInput {
  taskId: number
  title: string
  isCompleted: boolean
  isPinned?: boolean
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

export interface WorkItemTypeOption {
  id: number
  name: string
  color: string | null
}

export interface ExternalWorkItemSummary {
  id: number
  externalId: number
  title: string | null
  status: ExternalWorkItemStatus
  workItemTypeId: number
  workItemType: WorkItemTypeOption
  type: string
  color: string | null
}

export type ExternalWorkItemWithAttachments = ExternalWorkItemSummary & {
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
  scripts: ScriptWithCreator[]
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
  externalWorkItem: { id: number; type: string; externalId: number; color: string | null }
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
  externalWorkItem: Pick<ExternalWorkItemSummary, 'id' | 'type' | 'externalId' | 'color'> | null
  dismissedBy: Pick<User, 'id' | 'name' | 'username'> | null
  module: Pick<ModulePrisma, 'id' | 'name' | 'slug'> & { technology: { name: string } }
  hasUnreadUpdates: boolean
  hasScripts: boolean
  incidenceGantt: IncidenceGanttData | null
}

export const createUserSchema = z.object({
  username: z.string()
    .transform(normalizeUsername)
    .pipe(
      z.string()
        .min(3, 'Mínimo 3 caracteres')
        .max(30, 'Máximo 30 caracteres')
        .regex(/^[\p{L}]+(?: [\p{L}]+)*$/u, 'Solo letras y espacios')
    ),
  name: z.string()
    .max(100, 'Máximo 100 caracteres')
    .optional(),
  email: z.string()
    .email('Email inválido'),
  password: z.string()
    .min(8, 'Mínimo 8 caracteres'),
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
