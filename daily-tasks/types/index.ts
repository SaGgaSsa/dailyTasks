import { Incidence, User, SubTask, Assignment, Attachment, IncidencePage, Tracklist, TicketQA, Technology } from '@prisma/client'
import { TaskStatus, TaskType, Priority, AttachmentType } from './enums'

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
}
