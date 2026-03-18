import { auth } from '@/auth'
import { db } from '@/lib/db'
import { TaskStatus, UserRole } from '@prisma/client'

export interface AuthenticatedUser {
  id: number
  email: string
  name: string
  username: string
  role: UserRole
}

interface AccessContext {
  isAssigned: boolean
  status: TaskStatus | null
}

interface PageAccessContext extends AccessContext {
  authorId: number
}

interface ScriptAccessContext extends AccessContext {
  createdById: number
}

interface AttachmentAccessContext {
  id: number
  isOriginal: boolean
  type: 'FILE' | 'LINK'
  url: string
  externalWorkItemId: number
  uploadedById: number
  assignment: AccessContext
}

function parseUserRole(role: string): UserRole | null {
  if (role === UserRole.ADMIN || role === UserRole.DEV || role === UserRole.QA) {
    return role
  }

  return null
}

export function isEditableIncidenceStatus(status: TaskStatus): boolean {
  return status !== TaskStatus.DISMISSED
}

export function canManageTracklists(role: UserRole): boolean {
  return role === UserRole.ADMIN || role === UserRole.QA
}

export function canManageNonWorkingDays(role: UserRole): boolean {
  return role === UserRole.ADMIN || role === UserRole.QA
}

export function canManageUsers(role: UserRole): boolean {
  return role === UserRole.ADMIN
}

function canManageAssignedIncidence(user: AuthenticatedUser, context: AccessContext): boolean {
  if (!isEditableIncidenceStatus(context.status ?? TaskStatus.DISMISSED)) {
    return false
  }

  if (user.role === UserRole.ADMIN) {
    return true
  }

  return user.role === UserRole.DEV && context.isAssigned
}

export function canCreateIncidencePage(user: AuthenticatedUser, context: AccessContext): boolean {
  return canManageAssignedIncidence(user, context)
}

export function canEditIncidencePage(user: AuthenticatedUser, context: PageAccessContext): boolean {
  if (!canManageAssignedIncidence(user, context)) {
    return false
  }

  return user.role === UserRole.ADMIN || context.authorId === user.id
}

export function canDeleteIncidencePage(user: AuthenticatedUser, context: PageAccessContext): boolean {
  return canEditIncidencePage(user, context)
}

export function canSetMainIncidencePage(user: AuthenticatedUser, context: PageAccessContext): boolean {
  return canEditIncidencePage(user, context)
}

export function canCreateScript(user: AuthenticatedUser, context: AccessContext): boolean {
  return canManageAssignedIncidence(user, context)
}

export function canEditScript(user: AuthenticatedUser, context: ScriptAccessContext): boolean {
  if (!canManageAssignedIncidence(user, context)) {
    return false
  }

  return user.role === UserRole.ADMIN || context.createdById === user.id
}

export function canDeleteScript(user: AuthenticatedUser, context: ScriptAccessContext): boolean {
  return canEditScript(user, context)
}

export function canManageAttachment(user: AuthenticatedUser, context: AccessContext): boolean {
  return canManageAssignedIncidence(user, context)
}

export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  const session = await auth()

  if (!session?.user) {
    return null
  }

  const role = parseUserRole(session.user.role)
  const id = Number(session.user.id)

  if (!role || Number.isNaN(id) || id <= 0) {
    return null
  }

  return {
    id,
    email: session.user.email,
    name: session.user.name,
    username: session.user.username,
    role,
  }
}

export async function getIncidenceAccessContext(
  incidenceId: number,
  userId: number
): Promise<AccessContext | null> {
  const incidence = await db.incidence.findUnique({
    where: { id: incidenceId },
    select: {
      status: true,
      assignments: {
        where: { userId, isAssigned: true },
        select: { id: true },
        take: 1,
      },
    },
  })

  if (!incidence) {
    return null
  }

  return {
    status: incidence.status,
    isAssigned: incidence.assignments.length > 0,
  }
}

export async function getPageAccessContext(
  pageId: number,
  userId: number
): Promise<PageAccessContext | null> {
  const page = await db.incidencePage.findUnique({
    where: { id: pageId },
    select: {
      authorId: true,
      incidence: {
        select: {
          status: true,
          assignments: {
            where: { userId, isAssigned: true },
            select: { id: true },
            take: 1,
          },
        },
      },
    },
  })

  if (!page) {
    return null
  }

  return {
    authorId: page.authorId,
    status: page.incidence.status,
    isAssigned: page.incidence.assignments.length > 0,
  }
}

export async function getScriptAccessContext(
  scriptId: number,
  userId: number
): Promise<ScriptAccessContext | null> {
  const script = await db.script.findUnique({
    where: { id: scriptId },
    select: {
      createdById: true,
      incidence: {
        select: {
          status: true,
          assignments: {
            where: { userId, isAssigned: true },
            select: { id: true },
            take: 1,
          },
        },
      },
    },
  })

  if (!script) {
    return null
  }

  return {
    createdById: script.createdById,
    status: script.incidence.status,
    isAssigned: script.incidence.assignments.length > 0,
  }
}

export async function getExternalWorkItemAccessContext(
  externalWorkItemId: number,
  userId: number
): Promise<AccessContext | null> {
  const workItem = await db.externalWorkItem.findUnique({
    where: { id: externalWorkItemId },
    select: {
      incidences: {
        select: {
          status: true,
          assignments: {
            where: { userId, isAssigned: true },
            select: { id: true },
            take: 1,
          },
        },
      },
    },
  })

  if (!workItem) {
    return null
  }

  const assignedIncidence = workItem.incidences.find((incidence) => incidence.assignments.length > 0)

  return {
    isAssigned: !!assignedIncidence,
    status: assignedIncidence?.status ?? null,
  }
}

export async function getAttachmentAccessContext(
  attachmentId: number,
  userId: number
): Promise<AttachmentAccessContext | null> {
  const attachment = await db.attachment.findUnique({
    where: { id: attachmentId },
    select: {
      id: true,
      type: true,
      url: true,
      isOriginal: true,
      externalWorkItemId: true,
      uploadedById: true,
      externalWorkItem: {
        select: {
          incidences: {
            select: {
              status: true,
              assignments: {
                where: { userId, isAssigned: true },
                select: { id: true },
                take: 1,
              },
            },
          },
        },
      },
    },
  })

  if (!attachment) {
    return null
  }

  const assignedIncidence = attachment.externalWorkItem.incidences.find(
    (incidence) => incidence.assignments.length > 0
  )

  return {
    id: attachment.id,
    isOriginal: attachment.isOriginal,
    type: attachment.type,
    url: attachment.url,
    externalWorkItemId: attachment.externalWorkItemId,
    uploadedById: attachment.uploadedById,
    assignment: {
      isAssigned: !!assignedIncidence,
      status: assignedIncidence?.status ?? null,
    },
  }
}
