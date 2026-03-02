import { Incidence, User, SubTask, Assignment, Attachment, IncidencePage, Tracklist, TicketQA } from '@prisma/client'
import { TaskStatus, TaskType, TechStack, Priority, AttachmentType } from './enums'

export type { TaskStatus, TaskType, TechStack, Priority, AttachmentType }

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
  technology: TechStack
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
}
