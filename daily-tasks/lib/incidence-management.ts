import { Prisma, TaskStatus, TicketQAStatus } from '.prisma/client'

import { db } from '@/lib/db'
import { serializeExternalWorkItem } from '@/lib/work-item-types'
import type { AssigneeWithHours, IncidenceWithDetails } from '@/types'

export const DISMISSED_INCIDENCE_ERROR = 'No puede modificar una incidencia desestimada'

type AssignmentWriteClient = Pick<typeof db, 'assignment'>

export async function syncAssignments(
  client: AssignmentWriteClient,
  incidenceId: number,
  assignees: AssigneeWithHours[]
) {
  const currentAssignments = await client.assignment.findMany({
    where: { incidenceId },
  })

  const currentUserIds = currentAssignments.map((assignment) => assignment.userId)
  const nextUserIds = assignees.map((assignee) => assignee.userId)
  const toDeactivate = currentUserIds.filter((userId) => !nextUserIds.includes(userId))

  if (toDeactivate.length > 0) {
    await client.assignment.updateMany({
      where: {
        incidenceId,
        userId: { in: toDeactivate },
      },
      data: { isAssigned: false },
    })
  }

  for (const assignee of assignees) {
    await client.assignment.upsert({
      where: {
        incidenceId_userId: {
          incidenceId,
          userId: assignee.userId,
        },
      },
      update: {
        assignedHours: assignee.assignedHours,
        isAssigned: true,
      },
      create: {
        incidenceId,
        userId: assignee.userId,
        assignedHours: assignee.assignedHours,
        isAssigned: true,
      },
    })
  }
}

export function isDismissedIncidenceStatus(status: TaskStatus) {
  return status === TaskStatus.DISMISSED
}

export function getReadyForDeployAtPatch(previousStatus: TaskStatus, nextStatus: TaskStatus, occurredAt = new Date()) {
  return nextStatus === TaskStatus.REVIEW && previousStatus !== TaskStatus.REVIEW
    ? { readyForDeployAt: occurredAt }
    : {}
}

export async function syncLinkedTickets(incidenceId: number, newStatus: TaskStatus) {
  const targetTicketStatus =
    newStatus === TaskStatus.REVIEW
      ? TicketQAStatus.TEST
      : newStatus === TaskStatus.TODO || newStatus === TaskStatus.IN_PROGRESS
        ? TicketQAStatus.IN_DEVELOPMENT
        : null

  if (!targetTicketStatus) {
    return
  }

  await db.ticketQA.updateMany({
    where: {
      incidenceId,
      status: { notIn: [TicketQAStatus.COMPLETED, TicketQAStatus.DISMISSED] },
    },
    data: { status: targetTicketStatus },
  })
}

export const incidenceBaseInclude = {
  externalWorkItem: {
    include: {
      workItemType: true,
      attachments: {
        include: {
          uploadedBy: true,
        },
        orderBy: {
          createdAt: 'desc' as const,
        },
      },
    },
  },
  technology: true,
  assignments: {
    where: { isAssigned: true },
    include: {
      user: true,
      tasks: {
        orderBy: [
          { isCompleted: 'asc' as const },
          { isPinned: 'desc' as const },
          { completedAt: 'desc' as const },
          { createdAt: 'asc' as const },
        ],
      },
    },
  },
  pages: {
    include: {
      author: true,
    },
    orderBy: {
      createdAt: 'desc' as const,
    },
  },
  qaTickets: { select: { id: true } },
} satisfies Prisma.IncidenceInclude

export const incidenceDetailsInclude = {
  ...incidenceBaseInclude,
  scripts: {
    include: {
      createdBy: {
        select: { id: true, name: true, username: true },
      },
    },
    orderBy: { createdAt: 'asc' as const },
  },
} satisfies Prisma.IncidenceInclude

export type IncidenceDetailsPayload = Prisma.IncidenceGetPayload<{
  include: typeof incidenceDetailsInclude
}>

export function serializeIncidence(incidence: IncidenceDetailsPayload): IncidenceWithDetails {
  return {
    ...incidence,
    status: incidence.status as import('@/types/enums').TaskStatus,
    priority: incidence.priority as import('@/types/enums').Priority,
    externalWorkItem: serializeExternalWorkItem(incidence.externalWorkItem),
  }
}

interface ComputeNextIncidenceStatusParams {
  initialStatus: TaskStatus
  hasEstimatedTime: boolean
  hasAssignees: boolean
  totalTasks: number
  allTasksCompleted: boolean
  createdTasksCount: number
  completionChanged: boolean
  deletedTasksCount: number
}

export function computeNextIncidenceStatus(params: ComputeNextIncidenceStatusParams) {
  const {
    initialStatus,
    hasEstimatedTime,
    hasAssignees,
    totalTasks,
    allTasksCompleted,
    createdTasksCount,
    completionChanged,
    deletedTasksCount,
  } = params

  const allConditionsMet = hasEstimatedTime && hasAssignees
  const hasTaskStructureChanges = createdTasksCount > 0 || deletedTasksCount > 0
  const hasTaskStatusChanges = completionChanged || hasTaskStructureChanges

  if (!hasAssignees && ([TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.REVIEW] as TaskStatus[]).includes(initialStatus)) {
    return TaskStatus.BACKLOG
  }

  if (initialStatus === TaskStatus.BACKLOG) {
    if (!allConditionsMet) return TaskStatus.BACKLOG
    if (totalTasks > 0) {
      return allTasksCompleted ? TaskStatus.REVIEW : TaskStatus.IN_PROGRESS
    }
    return TaskStatus.TODO
  }

  if (initialStatus === TaskStatus.DONE) {
    if (createdTasksCount === 0) return TaskStatus.DONE
    return totalTasks > 0 && allTasksCompleted ? TaskStatus.REVIEW : TaskStatus.IN_PROGRESS
  }

  if (!hasEstimatedTime) {
    return initialStatus
  }

  if (totalTasks > 0 && allTasksCompleted) {
    return TaskStatus.REVIEW
  }

  if (initialStatus === TaskStatus.REVIEW && hasTaskStatusChanges) {
    return TaskStatus.IN_PROGRESS
  }

  if (initialStatus === TaskStatus.TODO && hasTaskStatusChanges && totalTasks > 0) {
    return TaskStatus.IN_PROGRESS
  }

  if (initialStatus === TaskStatus.IN_PROGRESS) {
    return TaskStatus.IN_PROGRESS
  }

  return initialStatus
}

export function shouldMoveActiveIncidenceToBacklog(hasAssignees: boolean) {
  return !hasAssignees
}

export function canActivateBacklogIncidence(hasEstimatedTime: boolean, hasAssignees: boolean) {
  return hasEstimatedTime && hasAssignees
}
