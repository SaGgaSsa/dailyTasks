import { Prisma, ExternalWorkItemStatus, Priority as PrismaPriority, TaskStatus, EnvironmentLogEntryType } from '.prisma/client'
import { revalidatePath } from 'next/cache'

import { db } from '@/lib/db'
import { isExternalWorkItemActive } from '@/lib/external-work-item-guards'
import { TicketType, TicketQAStatus } from '@/types/enums'
import { externalWorkItemBaseSelect, serializeExternalWorkItem } from '@/lib/work-item-types'
import { sanitizeObservationHtml } from '@/lib/ticket-images'
import { getPlanningWarnings, getTotalAssignedHours } from '@/lib/planning-diagnostics'

export const ticketDetailsInclude = {
  reportedBy: { select: { id: true, name: true, username: true } },
  assignedTo: { select: { id: true, name: true, username: true } },
  externalWorkItem: { select: externalWorkItemBaseSelect },
  referenceEnvironment: { select: { id: true, name: true } },
  dismissedBy: { select: { id: true, name: true, username: true } },
  module: { select: { id: true, name: true, slug: true, technology: { select: { name: true } } } },
  incidence: {
    select: {
      id: true,
      status: true,
      readyForDeployAt: true,
      updatedAt: true,
      startedAt: true,
      completedAt: true,
      deferredAt: true,
      estimatedTime: true,
      assignments: {
        where: { isAssigned: true },
        select: {
          assignedHours: true,
          tasks: { select: { id: true } },
        },
      },
      _count: {
        select: { scripts: true },
      },
    },
  },
} satisfies Prisma.TicketQAInclude

type TicketWithScripts = Prisma.TicketQAGetPayload<{ include: typeof ticketDetailsInclude }>

export interface TicketDeploymentSummary {
  isCurrentlyDeployed: boolean
  deployedEnvironmentCount: number
  latestDeployedAt: Date | null
}

export function enrichTicketScripts<T extends TicketWithScripts>(ticket: T) {
  const incidence = ticket.incidence

  const incidenceGantt = incidence ? {
    id: incidence.id,
    status: incidence.status as import('@/types/enums').TaskStatus,
    startedAt: incidence.startedAt,
    completedAt: incidence.completedAt,
    deferredAt: incidence.deferredAt,
    estimatedTime: incidence.estimatedTime,
    totalAssignedHours: getTotalAssignedHours(incidence.assignments),
    planningWarnings: getPlanningWarnings({
      status: incidence.status,
      estimatedTime: incidence.estimatedTime,
      assignments: incidence.assignments,
      scriptsCount: incidence._count.scripts,
    }),
  } : null

  return {
    ...ticket,
    externalWorkItem: ticket.externalWorkItem ? serializeExternalWorkItem(ticket.externalWorkItem) : null,
    hasScripts: (incidence?._count?.scripts ?? 0) > 0,
    deploymentSummary: {
      isCurrentlyDeployed: false,
      deployedEnvironmentCount: 0,
      latestDeployedAt: null,
    } satisfies TicketDeploymentSummary,
    incidenceGantt,
  }
}

export async function addTicketDeploymentSummaries<T extends {
  id: number
  incidence?: { readyForDeployAt: Date | null; updatedAt: Date } | null
}>(
  tickets: T[]
): Promise<Array<T & { deploymentSummary: TicketDeploymentSummary }>> {
  if (tickets.length === 0) {
    return []
  }

  const [environments, deploys] = await Promise.all([
    db.environment.findMany({
      where: { isEnabled: true },
      select: { id: true },
    }),
    db.environmentLogEntry.groupBy({
      by: ['ticketId', 'environmentId'],
      where: {
        type: EnvironmentLogEntryType.DEPLOY,
        ticketId: { in: tickets.map((ticket) => ticket.id) },
      },
      _max: { occurredAt: true },
    }),
  ])

  const activeEnvironmentIds = new Set(environments.map((environment) => environment.id))
  const latestDeploysByTicket = new Map<number, Date[]>()

  for (const deploy of deploys) {
    if (!deploy.ticketId || !activeEnvironmentIds.has(deploy.environmentId) || !deploy._max.occurredAt) {
      continue
    }

    const values = latestDeploysByTicket.get(deploy.ticketId) ?? []
    values.push(deploy._max.occurredAt)
    latestDeploysByTicket.set(deploy.ticketId, values)
  }

  return tickets.map((ticket) => {
    const readyForDeployAt = ticket.incidence
      ? ticket.incidence.readyForDeployAt ?? ticket.incidence.updatedAt
      : null
    const availableDeploys = (latestDeploysByTicket.get(ticket.id) ?? [])
      .filter((lastDeployedAt) => !readyForDeployAt || lastDeployedAt >= readyForDeployAt)
    const latestDeployedAt = availableDeploys.reduce<Date | null>(
      (latest, deployedAt) => (!latest || deployedAt > latest ? deployedAt : latest),
      null
    )

    return {
      ...ticket,
      deploymentSummary: {
        isCurrentlyDeployed: availableDeploys.length > 0,
        deployedEnvironmentCount: availableDeploys.length,
        latestDeployedAt,
      },
    }
  })
}

const PRIORITY_MAP: Record<string, PrismaPriority> = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  BLOCKER: 'BLOCKER',
}

const TICKET_TYPE_TITLE_PREFIX: Record<TicketType, string> = {
  [TicketType.BUG]: 'Corrección',
  [TicketType.CAMBIO]: 'Modificación',
  [TicketType.CONSULTA]: 'Consulta',
}

const TICKET_TYPE_TASK_TITLE: Record<TicketType, string> = {
  [TicketType.BUG]: 'Corrección',
  [TicketType.CAMBIO]: 'Modificación',
  [TicketType.CONSULTA]: 'Análisis',
}

type AssignmentTransactionClient = Pick<typeof db, 'incidence' | 'assignment' | 'task' | 'ticketQA' | 'externalWorkItem'>

async function assignTicketToNewIncidenceCore(
  client: AssignmentTransactionClient,
  ticketId: number,
  assignedToId: number
): Promise<{ success: true } | { success: false; error: string }> {
  const ticket = await client.ticketQA.findUnique({
    where: { id: ticketId },
    include: { module: { select: { id: true, name: true, slug: true, technologyId: true } } },
  })

  if (!ticket) {
    return { success: false, error: 'Ticket no encontrado' }
  }

  const workItem = ticket.externalWorkItemId
    ? await client.externalWorkItem.findUnique({
      where: { id: ticket.externalWorkItemId },
      select: externalWorkItemBaseSelect,
    })
    : null

  if (!workItem) {
    return { success: false, error: 'El ticket no tiene un trámite externo válido. Debe vincularse un ExternalWorkItem existente.' }
  }

  if (!isExternalWorkItemActive(workItem)) {
    return { success: false, error: 'No se puede usar un trámite externo inactivo' }
  }

  const incidencePriority = PRIORITY_MAP[ticket.priority] ?? 'MEDIUM'
  const titlePrefix = TICKET_TYPE_TITLE_PREFIX[ticket.type as TicketType]
  const taskTitle = TICKET_TYPE_TASK_TITLE[ticket.type as TicketType]
  const serializedWorkItem = serializeExternalWorkItem(workItem)
  const title = serializedWorkItem.title || `${titlePrefix} – ${serializedWorkItem.type} ${serializedWorkItem.externalId}`

  const newIncidence = await client.incidence.create({
    data: {
      externalWorkItemId: workItem.id,
      description: ticket.description || title,
      technologyId: ticket.module.technologyId,
      priority: incidencePriority,
      status: TaskStatus.BACKLOG,
    },
  })

  const assignment = await client.assignment.upsert({
    where: { incidenceId_userId: { incidenceId: newIncidence.id, userId: assignedToId } },
    create: { incidenceId: newIncidence.id, userId: assignedToId, isAssigned: true },
    update: { isAssigned: true },
  })

  await client.task.create({
    data: {
      title: taskTitle,
      description: sanitizeObservationHtml(ticket.observations),
      assignmentId: assignment.id,
    },
  })

  await client.ticketQA.update({
    where: { id: ticketId },
    data: {
      status: TicketQAStatus.ASSIGNED,
      assignedToId,
      incidenceId: newIncidence.id,
      hasUnreadUpdates: false,
    },
  })

  return { success: true }
}

export async function assignTicketToNewIncidence(
  ticketId: number,
  assignedToId: number,
  tracklistId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await db.$transaction(async (tx) => {
      const assignmentResult = await assignTicketToNewIncidenceCore(tx, ticketId, assignedToId)
      if (!assignmentResult.success) {
        throw new Error(assignmentResult.error)
      }
    })

    revalidatePath(`/tracklists/${tracklistId}`)
    revalidatePath('/incidences')
    return { success: true, ...(result ?? {}) }
  } catch (error) {
    console.error('Error in assignment transaction:', error)
    if (error instanceof Error && 'code' in error && error.code === 'P2002') {
      return { success: false, error: 'Ya existe una incidencia con ese trámite y tipo' }
    }
    return { success: false, error: error instanceof Error ? error.message : 'Error al ejecutar la asignación' }
  }
}

export { ExternalWorkItemStatus }
export { assignTicketToNewIncidenceCore }
