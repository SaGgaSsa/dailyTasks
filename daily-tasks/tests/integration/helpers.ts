import type { Priority, TaskStatus, TaskType, TicketQAStatus, TicketType } from '@prisma/client'

import { db } from '@/lib/db'
import { type WorkItemTypeColor } from '@/lib/work-item-color-options'
import { setMockSession } from '@/tests/integration/setup'

type UserRole = 'ADMIN' | 'DEV' | 'QA'

let sequence = 1

function nextValue(prefix: string) {
  const value = `${prefix}-${sequence}`
  sequence += 1
  return value
}

export async function createUser(role: UserRole, overrides?: Partial<{ name: string; username: string; email: string }>) {
  const username = overrides?.username ?? nextValue(role.toLowerCase())
  return db.user.create({
    data: {
      email: overrides?.email ?? `${username}@example.com`,
      password: 'test-password',
      name: overrides?.name ?? username,
      username,
      role,
    },
  })
}

export function actAs(user: { id: number; email: string; username: string; role: string; name: string | null }) {
  setMockSession({
    user: {
      id: String(user.id),
      email: user.email,
      name: user.name ?? user.username,
      username: user.username,
      role: user.role,
    },
  })
}

export async function createTechnologyModule() {
  const technology = await db.technology.create({
    data: {
      name: nextValue('tech'),
    },
  })

  const moduleRecord = await db.module.create({
    data: {
      name: nextValue('module'),
      slug: nextValue('module-slug'),
      technologyId: technology.id,
    },
  })

  return { technology, module: moduleRecord }
}

export async function createExternalWorkItem(type: TaskType = 'I_MODAPL') {
  const typeColors: Record<TaskType, WorkItemTypeColor> = {
    I_MODAPL: 'blue',
    I_CASO: 'orange',
    I_CONS: 'purple',
  }

  const workItemType = await db.workItemType.upsert({
    where: { name: type },
    update: { color: typeColors[type] },
    create: { name: type, color: typeColors[type] },
  })

  return db.externalWorkItem.create({
    data: {
      workItemTypeId: workItemType.id,
      externalId: sequence * 100,
      title: nextValue('work-item'),
    },
  })
}

export async function createTracklist(createdById: number) {
  return db.tracklist.create({
    data: {
      title: nextValue('tracklist'),
      createdById,
    },
  })
}

interface CreateIncidenceFixtureOptions {
  status?: TaskStatus
  estimatedTime?: number | null
  startedAt?: Date | null
  completedAt?: Date | null
  technologyId: number
  externalWorkItemId: number
  assignees?: Array<{ userId: number; assignedHours?: number | null; isAssigned?: boolean }>
  tasks?: Array<{ userId: number; title: string; isCompleted?: boolean; isQaReported?: boolean; description?: string | null }>
}

export async function createIncidenceFixture(options: CreateIncidenceFixtureOptions) {
  const incidence = await db.incidence.create({
    data: {
      externalWorkItemId: options.externalWorkItemId,
      description: nextValue('incidence'),
      technologyId: options.technologyId,
      priority: 'MEDIUM',
      status: options.status ?? 'BACKLOG',
      estimatedTime: options.estimatedTime ?? null,
      startedAt: options.startedAt ?? null,
      completedAt: options.completedAt ?? null,
    },
  })

  const assignments = new Map<number, Awaited<ReturnType<typeof db.assignment.create>>>()

  for (const assignee of options.assignees ?? []) {
    const assignment = await db.assignment.create({
      data: {
        incidenceId: incidence.id,
        userId: assignee.userId,
        assignedHours: assignee.assignedHours ?? null,
        isAssigned: assignee.isAssigned ?? true,
      },
    })

    assignments.set(assignee.userId, assignment)
  }

  const tasks = []
  for (const task of options.tasks ?? []) {
    const assignment = assignments.get(task.userId)
    if (!assignment) {
      throw new Error(`Missing assignment for user ${task.userId}`)
    }

    tasks.push(
      await db.task.create({
        data: {
          assignmentId: assignment.id,
          title: task.title,
          description: task.description ?? null,
          isCompleted: task.isCompleted ?? false,
          isQaReported: task.isQaReported ?? false,
          completedAt: task.isCompleted ? new Date() : null,
        },
      })
    )
  }

  return {
    incidence,
    assignments,
    tasks,
  }
}

interface CreateTicketFixtureOptions {
  tracklistId: number
  moduleId: number
  reportedById: number
  externalWorkItemId?: number | null
  assignedToId?: number | null
  incidenceId?: number | null
  status?: TicketQAStatus
  type?: TicketType
  priority?: Priority
  description?: string
}

export async function createTicketFixture(options: CreateTicketFixtureOptions) {
  const lastTicket = await db.ticketQA.findFirst({
    where: { tracklistId: options.tracklistId },
    orderBy: { ticketNumber: 'desc' },
  })

  return db.ticketQA.create({
    data: {
      tracklistId: options.tracklistId,
      ticketNumber: (lastTicket?.ticketNumber ?? 0) + 1,
      moduleId: options.moduleId,
      reportedById: options.reportedById,
      externalWorkItemId: options.externalWorkItemId ?? null,
      assignedToId: options.assignedToId ?? null,
      incidenceId: options.incidenceId ?? null,
      status: options.status ?? 'NEW',
      type: options.type ?? 'BUG',
      priority: options.priority ?? 'MEDIUM',
      description: options.description ?? nextValue('ticket'),
    },
  })
}

export async function getIncidenceState(incidenceId: number) {
  return db.incidence.findUniqueOrThrow({
    where: { id: incidenceId },
    include: {
      assignments: {
        include: {
          tasks: true,
        },
      },
      pages: true,
      qaTickets: true,
    },
  })
}

export async function getTicketState(ticketId: number) {
  return db.ticketQA.findUniqueOrThrow({
    where: { id: ticketId },
  })
}
