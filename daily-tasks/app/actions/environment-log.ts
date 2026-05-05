'use server'

import { EnvironmentLogEntryType, TaskStatus, UserRole } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { randomUUID } from 'node:crypto'

import { db } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/authorization'

type ActionResult<T = undefined> = {
  success: boolean
  error?: string
  data?: T
}

export interface EnvironmentLogEnvironment {
  id: number
  name: string
  isFavorite: boolean
}

export interface PendingEnvironmentDeployItem {
  incidenceId: number
  ticketId: number | null
  subjectType: 'TICKET' | 'INCIDENCE'
  description: string
  workItem: {
    type: string
    externalId: number
    color: string | null
  }
  ticketNumber: number | null
  readyForDeployAt: Date
  lastDeployedAt: Date | null
}

export interface EnvironmentLogEntryView {
  id: number
  type: 'DEPLOY'
  occurredAt: Date
  createdBy: { id: number; name: string | null; username: string }
  incidence: {
    id: number
    description: string
    workItem: { type: string; externalId: number; color: string | null }
  } | null
  ticket: {
    id: number
    ticketNumber: number
    description: string
    tracklistId: number
  } | null
}

interface EnvironmentLogEventBase {
  id: string
  type: EnvironmentLogEntryType
  occurredAt: Date
  createdBy: { id: number; name: string | null; username: string }
}

export interface EnvironmentLogDeployBatchView extends EnvironmentLogEventBase {
  type: 'DEPLOY'
  batchId: string | null
  legacyEntryId: number | null
  items: EnvironmentLogEntryView[]
}

export interface EnvironmentLogConfigurationView extends EnvironmentLogEventBase {
  type: 'CONFIGURATION'
  batchId: null
  legacyEntryId: number
  items: []
  subject: string
  body: string
  validatedAt: Date | null
  validatedBy: { id: number; name: string | null; username: string } | null
  validationNote: string | null
}

export type EnvironmentLogBatchView = EnvironmentLogDeployBatchView | EnvironmentLogConfigurationView

export interface EnvironmentAvailabilityItem {
  environmentId: number
  environmentName: string
  isAvailable: boolean
  lastDeployedAt: Date | null
  readyForDeployAt: Date | null
}

interface DeployItemInput {
  incidenceId: number
}

interface RegisterDeployInput {
  environmentId: number
  items: DeployItemInput[]
}

interface CreateEnvironmentConfigurationInput {
  environmentId: number
  subject: string
  body: string
}

interface ValidateEnvironmentConfigurationInput {
  environmentId: number
  entryId: number
}

interface DeployBatchSqlInput {
  environmentId: number
  batchId?: string | null
  entryId?: number | null
}

interface AvailabilityInput {
  incidenceId?: number
  ticketId?: number
}

function isValidId(id: number) {
  return Number.isInteger(id) && id > 0
}

function mapEnvironmentLogEntry(entry: {
  id: number
  occurredAt: Date
  createdBy: { id: number; name: string | null; username: string }
  ticket: { id: number; ticketNumber: number; description: string; tracklistId: number } | null
  incidence: {
    id: number
    description: string
    externalWorkItem: {
      externalId: number
      workItemType: { name: string; color: string | null }
    }
  } | null
}): EnvironmentLogEntryView {
  return {
    id: entry.id,
    type: EnvironmentLogEntryType.DEPLOY,
    occurredAt: entry.occurredAt,
    createdBy: entry.createdBy,
    ticket: entry.ticket,
    incidence: entry.incidence
      ? {
          id: entry.incidence.id,
          description: entry.incidence.description,
          workItem: {
            type: entry.incidence.externalWorkItem.workItemType.name,
            externalId: entry.incidence.externalWorkItem.externalId,
            color: entry.incidence.externalWorkItem.workItemType.color,
          },
        }
      : null,
  }
}

function sortDeployEntriesByWorkItem<T extends {
  incidence: {
    externalWorkItem: {
      externalId: number
      workItemType: { name: string }
    }
  } | null
}>(entries: T[]) {
  return [...entries].sort((a, b) => {
    const typeA = a.incidence?.externalWorkItem.workItemType.name ?? ''
    const typeB = b.incidence?.externalWorkItem.workItemType.name ?? ''
    const typeComparison = typeA.localeCompare(typeB, 'es')
    if (typeComparison !== 0) return typeComparison

    const numberA = a.incidence?.externalWorkItem.externalId ?? 0
    const numberB = b.incidence?.externalWorkItem.externalId ?? 0
    return numberA - numberB
  })
}

function sortEnvironmentLogEntryViews(entries: EnvironmentLogEntryView[]) {
  return [...entries].sort((a, b) => {
    const typeComparison = (a.incidence?.workItem.type ?? '').localeCompare(b.incidence?.workItem.type ?? '', 'es')
    if (typeComparison !== 0) return typeComparison

    return (a.incidence?.workItem.externalId ?? 0) - (b.incidence?.workItem.externalId ?? 0)
  })
}

async function requireAuthenticatedUser() {
  const user = await getAuthenticatedUser()
  if (!user) {
    return { success: false, error: 'No autorizado' } as const
  }

  return { success: true, user } as const
}

async function requireDeployPermission() {
  const access = await requireAuthenticatedUser()
  if (!access.success) return access

  if (access.user.role !== UserRole.ADMIN && access.user.role !== UserRole.DEV) {
    return { success: false, error: 'No autorizado para registrar deploys' } as const
  }

  return access
}

async function requireConfigurationPermission() {
  const access = await requireAuthenticatedUser()
  if (!access.success) return access

  if (access.user.role !== UserRole.ADMIN && access.user.role !== UserRole.QA) {
    return { success: false, error: 'No autorizado para registrar configuraciones' } as const
  }

  return access
}

function withoutData<T>(result: ActionResult): ActionResult<T> {
  return {
    success: result.success,
    error: result.error,
  }
}

async function getEnabledEnvironment(environmentId: number) {
  if (!isValidId(environmentId)) {
    return null
  }

  return db.environment.findFirst({
    where: { id: environmentId, isEnabled: true },
    select: { id: true, name: true },
  })
}

function revalidateEnvironmentLogPaths(environmentId?: number, incidenceIds: number[] = [], tracklistIds: number[] = []) {
  revalidatePath('/bitacora')
  if (environmentId) {
    revalidatePath(`/bitacora/${environmentId}`)
  }
  revalidatePath('/incidences')
  revalidatePath('/tracklists')
  for (const incidenceId of incidenceIds) {
    revalidatePath(`/incidences/${incidenceId}`)
  }
  for (const tracklistId of tracklistIds) {
    revalidatePath(`/tracklists/${tracklistId}`)
  }
}

export async function getEnvironmentLogEnvironments(): Promise<ActionResult<EnvironmentLogEnvironment[]>> {
  const access = await requireAuthenticatedUser()
  if (!access.success) return withoutData(access)

  try {
    const environments = await db.environment.findMany({
      where: { isEnabled: true },
      orderBy: { name: 'asc' },
      include: {
        favorites: {
          where: { userId: access.user.id },
          select: { id: true },
        },
      },
    })

    return {
      success: true,
      data: environments.map((environment) => ({
        id: environment.id,
        name: environment.name,
        isFavorite: environment.favorites.length > 0,
      })),
    }
  } catch (error) {
    console.error('Error fetching environment log environments:', error)
    return { success: false, error: 'Error al obtener ambientes' }
  }
}

export async function getSidebarFavoriteEnvironments(): Promise<ActionResult<Array<{ id: number; name: string }>>> {
  const access = await requireAuthenticatedUser()
  if (!access.success) return withoutData(access)

  try {
    const favorites = await db.userEnvironmentFavorite.findMany({
      where: {
        userId: access.user.id,
        environment: { isEnabled: true },
      },
      select: {
        environment: {
          select: { id: true, name: true },
        },
      },
      orderBy: {
        environment: { name: 'asc' },
      },
    })

    return {
      success: true,
      data: favorites.map((favorite) => favorite.environment),
    }
  } catch (error) {
    console.error('Error fetching favorite environments:', error)
    return { success: false, error: 'Error al obtener favoritos' }
  }
}

export async function toggleEnvironmentFavorite(environmentId: number): Promise<ActionResult<{ isFavorite: boolean }>> {
  const access = await requireAuthenticatedUser()
  if (!access.success) return withoutData(access)

  const environment = await getEnabledEnvironment(environmentId)
  if (!environment) {
    return { success: false, error: 'Ambiente no encontrado' }
  }

  try {
    const existing = await db.userEnvironmentFavorite.findUnique({
      where: {
        userId_environmentId: {
          userId: access.user.id,
          environmentId,
        },
      },
      select: { id: true },
    })

    if (existing) {
      await db.userEnvironmentFavorite.delete({ where: { id: existing.id } })
      revalidateEnvironmentLogPaths(environmentId)
      return { success: true, data: { isFavorite: false } }
    }

    await db.userEnvironmentFavorite.create({
      data: {
        userId: access.user.id,
        environmentId,
      },
    })

    revalidateEnvironmentLogPaths(environmentId)
    return { success: true, data: { isFavorite: true } }
  } catch (error) {
    console.error('Error toggling environment favorite:', error)
    return { success: false, error: 'Error al actualizar favorito' }
  }
}

export async function getEnvironmentLogEntries(environmentId: number): Promise<ActionResult<EnvironmentLogBatchView[]>> {
  const access = await requireAuthenticatedUser()
  if (!access.success) return withoutData(access)

  const environment = await getEnabledEnvironment(environmentId)
  if (!environment) {
    return { success: false, error: 'Ambiente no encontrado' }
  }

  try {
    const entries = await db.environmentLogEntry.findMany({
      where: { environmentId },
      orderBy: [
        { occurredAt: 'asc' },
        { id: 'asc' },
      ],
      include: {
        createdBy: { select: { id: true, name: true, username: true } },
        ticket: { select: { id: true, ticketNumber: true, description: true, tracklistId: true } },
        validatedBy: { select: { id: true, name: true, username: true } },
        incidence: {
          select: {
            id: true,
            description: true,
            externalWorkItem: {
              select: {
                externalId: true,
                workItemType: { select: { name: true, color: true } },
              },
            },
          },
        },
      },
    })

    const deployBatches = new Map<string, EnvironmentLogDeployBatchView>()
    const configurationEvents: EnvironmentLogConfigurationView[] = []

    for (const entry of entries) {
      if (entry.type === EnvironmentLogEntryType.CONFIGURATION) {
        configurationEvents.push({
          id: `configuration-${entry.id}`,
          type: EnvironmentLogEntryType.CONFIGURATION,
          batchId: null,
          legacyEntryId: entry.id,
          occurredAt: entry.occurredAt,
          createdBy: entry.createdBy,
          items: [],
          subject: entry.subject ?? '',
          body: entry.body ?? '',
          validatedAt: entry.validatedAt,
          validatedBy: entry.validatedBy,
          validationNote: entry.validationNote,
        })
        continue
      }

      const batchId = entry.batchId ?? null
      const key = batchId ?? `legacy-${entry.id}`
      const item = mapEnvironmentLogEntry(entry)
      const existing = deployBatches.get(key)

      if (existing) {
        existing.items.push(item)
        if (entry.occurredAt > existing.occurredAt) {
          existing.occurredAt = entry.occurredAt
        }
        continue
      }

      deployBatches.set(key, {
        id: key,
        type: EnvironmentLogEntryType.DEPLOY,
        batchId,
        legacyEntryId: batchId ? null : entry.id,
        occurredAt: entry.occurredAt,
        createdBy: entry.createdBy,
        items: [item],
      })
    }

    const deployEvents = [...deployBatches.values()].map((batch) => ({
      ...batch,
      items: sortEnvironmentLogEntryViews(batch.items),
    }))

    return {
      success: true,
      data: [...deployEvents, ...configurationEvents].sort((a, b) => {
        const occurredComparison = a.occurredAt.getTime() - b.occurredAt.getTime()
        if (occurredComparison !== 0) return occurredComparison
        return (a.legacyEntryId ?? 0) - (b.legacyEntryId ?? 0)
      }),
    }
  } catch (error) {
    console.error('Error fetching environment log entries:', error)
    return { success: false, error: 'Error al obtener historial' }
  }
}

export async function createEnvironmentConfigurationLog(
  input: CreateEnvironmentConfigurationInput
): Promise<ActionResult<{ id: number }>> {
  const access = await requireConfigurationPermission()
  if (!access.success) return withoutData(access)

  const environment = await getEnabledEnvironment(input.environmentId)
  if (!environment) {
    return { success: false, error: 'Ambiente no encontrado' }
  }

  const subject = input.subject.trim()
  const body = input.body.trim()

  if (!subject) {
    return { success: false, error: 'Objeto requerido' }
  }

  if (subject.length > 500) {
    return { success: false, error: 'Objeto no puede superar 500 caracteres' }
  }

  if (!body) {
    return { success: false, error: 'Detalle requerido' }
  }

  try {
    const entry = await db.environmentLogEntry.create({
      data: {
        type: EnvironmentLogEntryType.CONFIGURATION,
        environmentId: input.environmentId,
        subject,
        body,
        createdById: access.user.id,
      },
      select: { id: true },
    })

    revalidateEnvironmentLogPaths(input.environmentId)
    return { success: true, data: entry }
  } catch (error) {
    console.error('Error creating environment configuration log:', error)
    return { success: false, error: 'Error al registrar configuración' }
  }
}

export async function validateEnvironmentConfigurationLog(
  input: ValidateEnvironmentConfigurationInput
): Promise<ActionResult<{ id: number }>> {
  const access = await requireConfigurationPermission()
  if (!access.success) return withoutData(access)

  const environment = await getEnabledEnvironment(input.environmentId)
  if (!environment) {
    return { success: false, error: 'Ambiente no encontrado' }
  }

  if (!isValidId(input.entryId)) {
    return { success: false, error: 'Entrada no encontrada' }
  }

  try {
    const entry = await db.environmentLogEntry.findFirst({
      where: {
        id: input.entryId,
        environmentId: input.environmentId,
      },
      select: {
        id: true,
        type: true,
        validatedAt: true,
      },
    })

    if (!entry || entry.type !== EnvironmentLogEntryType.CONFIGURATION) {
      return { success: false, error: 'Configuración no encontrada' }
    }

    if (entry.validatedAt) {
      return { success: false, error: 'La configuración ya fue validada' }
    }

    const result = await db.environmentLogEntry.updateMany({
      where: {
        id: input.entryId,
        environmentId: input.environmentId,
        type: EnvironmentLogEntryType.CONFIGURATION,
        validatedAt: null,
      },
      data: {
        validatedAt: new Date(),
        validatedById: access.user.id,
      },
    })

    if (result.count === 0) {
      return { success: false, error: 'La configuración ya fue validada' }
    }

    revalidateEnvironmentLogPaths(input.environmentId)
    return { success: true, data: { id: input.entryId } }
  } catch (error) {
    console.error('Error validating environment configuration log:', error)
    return { success: false, error: 'Error al validar configuración' }
  }
}

async function findPendingDeployItems(environmentId: number): Promise<PendingEnvironmentDeployItem[]> {
  const incidences = await db.incidence.findMany({
    where: { status: TaskStatus.REVIEW },
    select: {
      id: true,
      description: true,
      readyForDeployAt: true,
      updatedAt: true,
      externalWorkItem: {
        select: {
          externalId: true,
          workItemType: { select: { name: true, color: true } },
        },
      },
      qaTickets: {
        select: { id: true, ticketNumber: true },
        take: 1,
      },
    },
    orderBy: [
      { readyForDeployAt: 'asc' },
      { updatedAt: 'asc' },
    ],
  })

  const ticketIds = incidences.flatMap((incidence) => incidence.qaTickets.map((ticket) => ticket.id))
  const incidenceIds = incidences.filter((incidence) => incidence.qaTickets.length === 0).map((incidence) => incidence.id)

  const latestTicketDeploys = ticketIds.length
    ? await db.environmentLogEntry.groupBy({
        by: ['ticketId'],
        where: {
          environmentId,
          type: EnvironmentLogEntryType.DEPLOY,
          ticketId: { in: ticketIds },
        },
        _max: { occurredAt: true },
      })
    : []

  const latestIncidenceDeploys = incidenceIds.length
    ? await db.environmentLogEntry.groupBy({
        by: ['incidenceId'],
        where: {
          environmentId,
          type: EnvironmentLogEntryType.DEPLOY,
          ticketId: null,
          incidenceId: { in: incidenceIds },
        },
        _max: { occurredAt: true },
      })
    : []

  const ticketDeploys = new Map<number, Date | null>()
  for (const deploy of latestTicketDeploys) {
    if (deploy.ticketId) ticketDeploys.set(deploy.ticketId, deploy._max.occurredAt)
  }

  const incidenceDeploys = new Map<number, Date | null>()
  for (const deploy of latestIncidenceDeploys) {
    if (deploy.incidenceId) incidenceDeploys.set(deploy.incidenceId, deploy._max.occurredAt)
  }

  return incidences.flatMap((incidence) => {
    const ticket = incidence.qaTickets[0] ?? null
    const readyForDeployAt = incidence.readyForDeployAt ?? incidence.updatedAt
    const lastDeployedAt = ticket ? ticketDeploys.get(ticket.id) ?? null : incidenceDeploys.get(incidence.id) ?? null

    if (lastDeployedAt && lastDeployedAt >= readyForDeployAt) {
      return []
    }

    return [{
      incidenceId: incidence.id,
      ticketId: ticket?.id ?? null,
      subjectType: ticket ? 'TICKET' as const : 'INCIDENCE' as const,
      description: incidence.description,
      workItem: {
        type: incidence.externalWorkItem.workItemType.name,
        externalId: incidence.externalWorkItem.externalId,
        color: incidence.externalWorkItem.workItemType.color,
      },
      ticketNumber: ticket?.ticketNumber ?? null,
      readyForDeployAt,
      lastDeployedAt,
    }]
  })
}

export async function getPendingEnvironmentDeployItems(environmentId: number): Promise<ActionResult<PendingEnvironmentDeployItem[]>> {
  const access = await requireAuthenticatedUser()
  if (!access.success) return withoutData(access)

  const environment = await getEnabledEnvironment(environmentId)
  if (!environment) {
    return { success: false, error: 'Ambiente no encontrado' }
  }

  try {
    return { success: true, data: await findPendingDeployItems(environmentId) }
  } catch (error) {
    console.error('Error fetching pending environment deploys:', error)
    return { success: false, error: 'Error al obtener pendientes' }
  }
}

export async function registerEnvironmentDeploys(input: RegisterDeployInput): Promise<ActionResult<{ createdCount: number }>> {
  const access = await requireDeployPermission()
  if (!access.success) return withoutData(access)

  const environment = await getEnabledEnvironment(input.environmentId)
  if (!environment) {
    return { success: false, error: 'Ambiente no encontrado' }
  }

  const incidenceIds = [...new Set(input.items.map((item) => item.incidenceId))]
  if (incidenceIds.length === 0 || incidenceIds.some((id) => !isValidId(id))) {
    return { success: false, error: 'Seleccioná al menos una incidencia' }
  }

  try {
    const pendingItems = await findPendingDeployItems(input.environmentId)
    const pendingByIncidenceId = new Map(pendingItems.map((item) => [item.incidenceId, item]))
    const selectedItems = incidenceIds.map((incidenceId) => pendingByIncidenceId.get(incidenceId))

    if (selectedItems.some((item) => !item)) {
      return { success: false, error: 'La selección contiene incidencias que no están pendientes' }
    }

    const selected = selectedItems.filter((item): item is PendingEnvironmentDeployItem => Boolean(item))
    const tickets = selected
      .filter((item) => item.ticketId)
      .map((item) => item.ticketId as number)

    const ticketTracklists = tickets.length
      ? await db.ticketQA.findMany({
          where: { id: { in: tickets } },
          select: { id: true, tracklistId: true },
        })
      : []
    const tracklistIds = ticketTracklists.map((ticket) => ticket.tracklistId)

    const batchId = randomUUID()

    await db.environmentLogEntry.createMany({
      data: selected.map((item) => ({
        type: EnvironmentLogEntryType.DEPLOY,
        environmentId: input.environmentId,
        ticketId: item.ticketId,
        incidenceId: item.incidenceId,
        createdById: access.user.id,
        batchId,
      })),
    })

    revalidateEnvironmentLogPaths(input.environmentId, selected.map((item) => item.incidenceId), tracklistIds)
    return { success: true, data: { createdCount: selected.length } }
  } catch (error) {
    console.error('Error registering environment deploys:', error)
    return { success: false, error: 'Error al registrar deploy' }
  }
}

export async function getEnvironmentDeployBatchSql(
  input: DeployBatchSqlInput
): Promise<ActionResult<{ sql: string; hasSql: boolean }>> {
  const access = await requireAuthenticatedUser()
  if (!access.success) return withoutData(access)

  const environment = await getEnabledEnvironment(input.environmentId)
  if (!environment) {
    return { success: false, error: 'Ambiente no encontrado' }
  }

  if (!input.batchId && !input.entryId) {
    return { success: false, error: 'Batch no encontrado' }
  }

  try {
    const entries = await db.environmentLogEntry.findMany({
      where: {
        environmentId: input.environmentId,
        type: EnvironmentLogEntryType.DEPLOY,
        ...(input.batchId
          ? { batchId: input.batchId }
          : { id: input.entryId ?? undefined, batchId: null }),
      },
      include: {
        incidence: {
          include: {
            externalWorkItem: {
              include: {
                workItemType: true,
              },
            },
            scripts: {
              where: { type: 'SQL' },
              select: {
                content: true,
                createdAt: true,
                updatedAt: true,
              },
            },
          },
        },
      },
    })

    const sections = sortDeployEntriesByWorkItem(entries)
      .flatMap((entry) => {
        if (!entry.incidence || entry.incidence.scripts.length === 0) {
          return []
        }

        const scripts = [...entry.incidence.scripts].sort((a, b) => {
          const aTime = Math.max(a.createdAt.getTime(), a.updatedAt.getTime())
          const bTime = Math.max(b.createdAt.getTime(), b.updatedAt.getTime())
          return aTime - bTime
        })
        const workItem = entry.incidence.externalWorkItem
        const header = `--${workItem.workItemType.name} ${workItem.externalId} ${entry.incidence.description}`
        return [`${header}\n\n${scripts.map((script) => script.content).join('\n\n')}`]
      })

    return {
      success: true,
      data: {
        sql: sections.join('\n\n'),
        hasSql: sections.length > 0,
      },
    }
  } catch (error) {
    console.error('Error building environment deploy SQL:', error)
    return { success: false, error: 'Error al preparar SQL del deploy' }
  }
}

export async function getEnvironmentAvailability(input: AvailabilityInput): Promise<ActionResult<EnvironmentAvailabilityItem[]>> {
  const access = await requireAuthenticatedUser()
  if (!access.success) return withoutData(access)

  if (!input.ticketId && !input.incidenceId) {
    return { success: false, error: 'Debe indicar ticket o incidencia' }
  }

  try {
    const ticket = input.ticketId
      ? await db.ticketQA.findUnique({
          where: { id: input.ticketId },
          select: {
            id: true,
            incidence: { select: { id: true, readyForDeployAt: true, updatedAt: true } },
          },
        })
      : null

    const incidence = !ticket && input.incidenceId
      ? await db.incidence.findUnique({
          where: { id: input.incidenceId },
          select: {
            id: true,
            readyForDeployAt: true,
            updatedAt: true,
            qaTickets: { select: { id: true }, take: 1 },
          },
        })
      : null

    if (input.ticketId && !ticket) {
      return { success: false, error: 'Ticket no encontrado' }
    }

    if (!ticket && input.incidenceId && !incidence) {
      return { success: false, error: 'Incidencia no encontrada' }
    }

    const governingTicketId = ticket?.id ?? incidence?.qaTickets[0]?.id ?? null
    const governingIncidence = ticket?.incidence ?? incidence
    const readyForDeployAt = governingIncidence
      ? governingIncidence.readyForDeployAt ?? governingIncidence.updatedAt
      : null

    const environments = await db.environment.findMany({
      where: { isEnabled: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    })

    const logs = await db.environmentLogEntry.groupBy({
      by: ['environmentId'],
      where: {
        type: EnvironmentLogEntryType.DEPLOY,
        environmentId: { in: environments.map((environment) => environment.id) },
        ...(governingTicketId
          ? { ticketId: governingTicketId }
          : governingIncidence
            ? { ticketId: null, incidenceId: governingIncidence.id }
            : { ticketId: input.ticketId }),
      },
      _max: { occurredAt: true },
    })

    const latestByEnvironment = new Map(logs.map((log) => [log.environmentId, log._max.occurredAt]))

    return {
      success: true,
      data: environments.map((environment) => {
        const lastDeployedAt = latestByEnvironment.get(environment.id) ?? null
        return {
          environmentId: environment.id,
          environmentName: environment.name,
          isAvailable: Boolean(lastDeployedAt && (!readyForDeployAt || lastDeployedAt >= readyForDeployAt)),
          lastDeployedAt,
          readyForDeployAt,
        }
      }),
    }
  } catch (error) {
    console.error('Error fetching environment availability:', error)
    return { success: false, error: 'Error al consultar disponibilidad' }
  }
}
